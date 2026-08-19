# --- Stage 1: build the React frontend with Node ---
# Use Alpine for a smaller image; the build only needs Node + npm.
FROM node:20-alpine AS frontend

WORKDIR /build

# Cap V8 heap so the build fits in Render's free-tier builder memory.
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Install deps first for layer caching. package-lock.json is committed so
# `npm ci` is the right call; fall back to `npm install` if lock is missing.
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund --prefer-offline \
    || npm install --no-audit --no-fund --prefer-offline

# Copy the rest of the frontend source and build it.
# Vite outputs to ../static/dist per vite.config.ts — create that path first.
COPY frontend/ ./
RUN mkdir -p /static/dist && npm run build


# --- Stage 2: Python runtime serving Flask + the built SPA ---
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install Python deps first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code.
COPY app.py ./
COPY tests/ ./tests/
COPY conftest.py pyproject.toml ./

# Copy the built frontend bundle from stage 1.
COPY --from=frontend /static/dist ./static/dist

# Render uses PORT env var; default to 5000 for local docker run.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=5000 \
    ONYX_DB_PATH=/tmp/onyxdashboard.db

EXPOSE 5000

# Gunicorn with threaded workers so SSE streams don't block other requests.
# Single worker + 8 threads keeps memory low (~80 MB RSS) on Render free tier
# while still supporting concurrent SSE subscribers.
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "1", \
     "--threads", "8", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "app:app"]
