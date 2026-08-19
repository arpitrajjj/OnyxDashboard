# --- Stage 1: build the React frontend with Node ---
FROM node:20-slim AS frontend

WORKDIR /build

# Install deps first for layer caching
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Copy the rest of the frontend source and build it
COPY frontend/ ./
# Vite outputs to ../static/dist (see vite.config.ts), so we need to create
# that directory on the host's path mapping inside the container.
RUN mkdir -p ../static/dist && npm run build


# --- Stage 2: Python runtime serving Flask + the built SPA ---
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install Python deps first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY app.py ./
COPY tests/ ./tests/
COPY conftest.py pyproject.toml ./

# Copy the built frontend bundle from stage 1
COPY --from=frontend /static/dist ./static/dist

# Render uses PORT env var; default to 5000 for local docker run
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=5000

EXPOSE 5000

# Gunicorn with threaded workers so SSE streams don't block other requests.
# --timeout 120 covers slow SSE connections; --threads 8 handles concurrent
# SSE subscribers on a single worker.
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "2", \
     "--threads", "8", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "app:app"]
