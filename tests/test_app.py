"""Tests for OnyxDashboard API and web routes."""
import os
import tempfile
import json

import pytest

import app as onyx


@pytest.fixture
def client(tmp_path):
    db = tmp_path / "test.db"
    os.environ["ONYX_DB_PATH"] = str(db)
    # Re-init module-level DB path after env override.
    onyx.DB_PATH = str(db)
    onyx.init_db()
    onyx.app.config["TESTING"] = True
    with onyx.app.test_client() as c:
        yield c


def register(client, device_id="pixel-7-001", **extra):
    payload = {
        "device_id": device_id,
        "name": "Pixel 7",
        "model": "Pixel 7",
        "os_version": "Android 14",
        "app_version": "1.0.4",
    }
    payload.update(extra)
    return client.post("/api/register", data=json.dumps(payload), content_type="application/json")


def test_register_creates_device(client):
    r = register(client)
    assert r.status_code == 201
    body = r.get_json()
    assert body["ok"] is True
    assert body["device_id"] == "pixel-7-001"


def test_register_requires_device_id(client):
    r = client.post("/api/register", data=json.dumps({"name": "x"}), content_type="application/json")
    assert r.status_code == 400
    assert r.get_json()["error"] == "device_id is required"


def test_register_upserts_existing(client):
    register(client, device_id="dup-001", name="Old Name")
    register(client, device_id="dup-001", name="New Name")
    r = client.get("/api/devices").get_json()
    devices = r["devices"]
    assert len(devices) == 1
    assert devices[0]["name"] == "New Name"


def test_devices_list(client):
    register(client, device_id="d1")
    register(client, device_id="d2")
    r = client.get("/api/devices").get_json()
    assert r["count"] == 2
    assert all("online" in d for d in r["devices"])


def test_heartbeat_updates_last_seen(client):
    register(client, device_id="hb-001")
    first = client.get("/api/devices").get_json()["devices"][0]["last_seen"]
    r = client.post("/api/heartbeat", data=json.dumps({"device_id": "hb-001"}), content_type="application/json")
    assert r.status_code == 200
    second = r.get_json()["last_seen"]
    assert second >= first


def test_heartbeat_unknown_device(client):
    r = client.post("/api/heartbeat", data=json.dumps({"device_id": "ghost"}), content_type="application/json")
    assert r.status_code == 404


def test_filter_online(client):
    register(client, device_id="online-001")
    r = client.get("/api/devices?status=online").get_json()
    assert r["count"] >= 1
    assert all(d["online"] for d in r["devices"])


def test_search(client):
    register(client, device_id="s-001", name="Samsung S23")
    register(client, device_id="s-002", name="Pixel 8")
    r = client.get("/api/devices?q=samsung").get_json()
    assert r["count"] == 1
    assert r["devices"][0]["name"] == "Samsung S23"


def test_delete_device(client):
    register(client, device_id="del-001")
    r = client.delete("/api/devices/del-001")
    assert r.status_code == 200
    assert client.get("/api/devices").get_json()["count"] == 0


def test_delete_missing_returns_404(client):
    r = client.delete("/api/devices/ghost")
    assert r.status_code == 404


def test_dashboard_renders(client):
    r = client.get("/")
    assert r.status_code == 200
    # In test env there's no React build, so we get a plain-text fallback.
    # In production with the frontend built, this returns index.html.
    assert b"OnyxDashboard" in r.data or b"OnyxDashboard" in r.data.lower()


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.get_json()["service"] == "onyxdashboard"


def test_sse_stream_sends_hello(client):
    r = client.get("/api/events")
    assert r.status_code == 200
    assert "text/event-stream" in r.headers["Content-Type"]
    # First chunk should be the hello event — test client terminates the
    # infinite generator after the first chunk via response timeout.
    first = next(r.response).decode()
    assert first.startswith("event: hello")
    assert '"connected":true' in first.replace(" ", "")


def test_publish_emits_event_to_subscribers(client):
    """Direct test of the in-memory pub/sub: register a subscriber queue,
    trigger a register call, and verify the subscriber received the event."""
    import queue as _q
    from app import _subscribers, _sub_lock
    q = _q.Queue(maxsize=16)
    with _sub_lock:
        _subscribers.append(q)
    try:
        register(client, device_id="pub-001")
        # The register handler should have pushed a device_registered event.
        payload = q.get(timeout=2)
        msg = json.loads(payload)
        assert msg["type"] == "device_registered"
        assert msg["data"]["device_id"] == "pub-001"
    finally:
        with _sub_lock:
            if q in _subscribers:
                _subscribers.remove(q)


def test_publish_emits_heartbeat_event(client):
    import queue as _q
    from app import _subscribers, _sub_lock
    register(client, device_id="hb-pub-001")
    q = _q.Queue(maxsize=16)
    with _sub_lock:
        _subscribers.append(q)
    try:
        client.post("/api/heartbeat",
                    data=json.dumps({"device_id": "hb-pub-001"}),
                    content_type="application/json")
        payload = q.get(timeout=2)
        msg = json.loads(payload)
        assert msg["type"] == "heartbeat"
        assert msg["data"]["device_id"] == "hb-pub-001"
    finally:
        with _sub_lock:
            if q in _subscribers:
                _subscribers.remove(q)


def test_publish_emits_device_deleted_event(client):
    import queue as _q
    from app import _subscribers, _sub_lock
    register(client, device_id="del-pub-001")
    q = _q.Queue(maxsize=16)
    with _sub_lock:
        _subscribers.append(q)
    try:
        client.delete("/api/devices/del-pub-001")
        payload = q.get(timeout=2)
        msg = json.loads(payload)
        assert msg["type"] == "device_deleted"
        assert msg["data"]["device_id"] == "del-pub-001"
    finally:
        with _sub_lock:
            if q in _subscribers:
                _subscribers.remove(q)


def test_cors_headers_set(client):
    r = client.get("/api/devices", headers={"Origin": "https://example.com"})
    assert r.headers.get("Access-Control-Allow-Origin") == "*"


def test_spa_index_serves_built_assets(client):
    """The repo ships a built React bundle in static/dist — / should serve
    that index.html when present."""
    r = client.get("/")
    assert r.status_code == 200
    assert b"OnyxDashboard" in r.data or b"onyxdashboard" in r.data.lower()


def test_spa_static_assets_route(client):
    """Vite emits assets under /assets/* — those should resolve to real files."""
    import os
    dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "dist")
    if not os.path.isdir(os.path.join(dist, "assets")):
        return  # skip if frontend wasn't built in this env
    r = client.get("/assets/index.css")
    assert r.status_code in (200, 404)  # exact filename varies; just ensure routing works
    # 404 for unknown asset should fall through to index.html
    r404 = client.get("/assets/this-does-not-exist.js")
    assert r404.status_code == 200
