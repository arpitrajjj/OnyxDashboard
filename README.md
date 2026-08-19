# OnyxDashboard

A clean, dark-themed Python web dashboard for managing Android devices registered from the
[OnyxBridge](https://github.com/arpitrajjj/OnyxBridge) native library. Built with Flask and
SQLite, deployable via Docker in one command.

![OnyxDashboard](screenshots/dashboard-overview.png)

## Features

- **Device registration** — Android apps register themselves on first launch via `POST /api/register`.
- **Heartbeat tracking** — Devices ping `POST /api/heartbeat` periodically. A device is **online** if it has pinged within the last 60s.
- **Live dashboard** — Dark-themed UI with stat cards, device table, status badges, search and status filter.
- **Search & filter** — Filter by `online` / `offline` status, or search across name, device ID, and model.
- **Auto refresh** — The dashboard polls `/api/devices` every 10 seconds so the table is always live.
- **Inline delete** — Remove a stale device directly from the table without leaving the page.
- **Containerised** — Ships with a production-ready Dockerfile and docker-compose.yml.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/register` | Register or update a device. Body: `device_id`, `name`, `model`, `os_version`, `app_version`. |
| `POST` | `/api/heartbeat` | Refresh the device's `last_seen` timestamp. Body: `device_id`. |
| `GET`  | `/api/devices`   | List all devices with online/offline status. Supports `?status=online|offline` and `?q=keyword`. |
| `DELETE` | `/api/devices/{device_id}` | Remove a device from the fleet. |
| `GET`  | `/healthz` | Liveness probe. |

### Example: register from Android (OkHttp)

```kotlin
val body = """{"device_id":"pixel-7-001","name":"Pixel 7","model":"Pixel 7","os_version":"Android 14","app_version":"1.0.4"}"""
val req = Request.Builder()
    .url("https://onyxdash.example.com/api/register")
    .post(body.toRequestBody("application/json".toMediaType()))
    .build()
httpClient.newCall(req).execute()
```

### Example: heartbeat

```bash
curl -X POST https://onyxdash.example.com/api/heartbeat \
     -H 'Content-Type: application/json' \
     -d '{"device_id":"pixel-7-001"}'
```

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py
# open http://localhost:5000
```

The app seeds itself with 12 sample devices on first launch (only when the DB is empty)
so the dashboard is not blank during your first visit. Restart the container at any
time — `onyxdashboard.db` is persisted under `/data` when running through docker-compose.

## Run with Docker

```bash
docker compose up --build -d
# open http://localhost:5000
```

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `ONYX_DB_PATH` | `onyxdashboard.db` | SQLite database file path. |
| `ONYX_HEARTBEAT_TIMEOUT` | `60` | Seconds since `last_seen` before a device flips to offline. |
| `PORT` | `5000` | Port the Flask dev server binds (ignored by gunicorn in Docker). |

## CI

GitHub Actions (`.github/workflows/ci.yml`) on every push / PR:

1. `pytest` against a temp SQLite DB
2. Smoke test — boots the app under the test client and probes `/healthz` + `/api/devices`
3. `docker build` with buildx layer caching
4. Container smoke test — runs the image, curls `/healthz`

## Project layout

```
OnyxDashboard/
├── app.py                  # Flask app + SQLite + API + UI
├── templates/dashboard.html
├── static/css/style.css
├── static/js/app.js
├── tests/test_app.py
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .github/workflows/ci.yml
└── screenshots/            # Playwright captures
```

## License

MIT.
