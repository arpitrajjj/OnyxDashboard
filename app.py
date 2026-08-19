"""
OnyxDashboard - Flask web dashboard for managing Android devices.
Provides device registration, heartbeat tracking, and a clean dark-themed UI.
"""
import os
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template, g, abort

DB_PATH = os.environ.get("ONYX_DB_PATH", "onyxdashboard.db")
HEARTBEAT_TIMEOUT_SECONDS = int(os.environ.get("ONYX_HEARTBEAT_TIMEOUT", "60"))

app = Flask(__name__)


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
    ip_address = payload.get("ip_address") or request.headers.get("X-Forwarded-For") or request.remote_addr or ""
    metadata = payload.get("metadata") or ""

    db = get_db()
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
    cur = db.execute("UPDATE devices SET last_seen=? WHERE device_id=?", (now, device_id))
    db.commit()

    if cur.rowcount == 0:
        return jsonify({"ok": False, "error": "device not registered"}), 404

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
    db.commit()
    if cur.rowcount == 0:
        return jsonify({"ok": False, "error": "device not found"}), 404
    return jsonify({"ok": True, "device_id": device_id})


# ---------------------------------------------------------------------------
# Web UI
# ---------------------------------------------------------------------------
@app.get("/")
def dashboard():
    return render_template("dashboard.html")


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
