# ==============================================================================
# Google Cloud Run Production Multi-Stage Dockerfile
# Engineered for Enterprise AI Deployment Platform (Google FDE)
# ==============================================================================

# STAGE 1: Build & Dependencies
FROM python:3.11-slim-bullseye AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# STAGE 2: Distroless / Lean Production Runtime
FROM python:3.11-slim-bullseye AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Security: Dedicated least-privilege non-root execution user (UID 10001)
RUN groupadd -r -g 10001 appgroup && \
    useradd -r -u 10001 -g appgroup -d /app -s /sbin/nologin appuser

# Copy virtual environment and project sources
COPY --from=builder /opt/venv /opt/venv
COPY backend /app/backend
COPY sample-projects /app/sample-projects

# Create storage directories and assign ownership
RUN mkdir -p /app/storage/uploads /app/storage/extracted && \
    chown -R appuser:appgroup /app

USER appuser:appgroup

# Production Cloud Run Health Check Probe
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

ENTRYPOINT ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
