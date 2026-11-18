from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from backend.app.core.config import settings
from backend.app.db.session import engine, Base
import backend.app.models  # ensure models are registered with Base
from backend.app.api.v1.endpoints.health import router as health_router
from backend.app.api.v1.endpoints.auth import router as auth_router
from backend.app.api.v1.endpoints.workspaces import router as workspaces_router
from backend.app.api.v1.endpoints.projects import router as projects_router
from backend.app.api.v1.endpoints.artifacts import router as artifacts_router
from backend.app.api.v1.endpoints.diagnostics import router as diagnostics_router
from backend.app.api.v1.endpoints.data_readiness import router as data_readiness_router
from backend.app.api.v1.endpoints.reports import router as reports_router
from backend.app.api.v1.endpoints.agents import router as agents_router
from backend.app.api.v1.endpoints.workbench import router as workbench_router
from backend.app.api.v1.endpoints.infra import router as infra_router
from backend.app.api.v1.endpoints.metrics import router as metrics_router
from backend.app.api.v1.endpoints.benchmark import router as benchmark_router
from backend.app.core.security_headers import SecurityHeadersMiddleware
from backend.app.core.rate_limiter import RateLimiterMiddleware
from backend.app.core.telemetry import ObservabilityMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("fde-platform")

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenTelemetry Distributed Tracing & Logging Middleware
app.add_middleware(ObservabilityMiddleware)

# OWASP Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Token Bucket Rate Limiting Middleware
app.add_middleware(RateLimiterMiddleware, capacity=120.0, refill_rate=30.0)


@app.get("/health", summary="Root Health Check")
def root_health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


# Include v1 routers
app.include_router(health_router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(workspaces_router, prefix=f"{settings.API_V1_STR}/workspaces", tags=["Workspaces"])
app.include_router(projects_router, prefix=f"{settings.API_V1_STR}/projects", tags=["Projects"])
app.include_router(artifacts_router, prefix=settings.API_V1_STR, tags=["Artifacts & Discovery"])
app.include_router(diagnostics_router, prefix=settings.API_V1_STR, tags=["Static Diagnostics"])
app.include_router(data_readiness_router, prefix=settings.API_V1_STR, tags=["Data Readiness & RAG"])
app.include_router(reports_router, prefix=settings.API_V1_STR, tags=["Production Readiness & Reports"])
app.include_router(agents_router, prefix=settings.API_V1_STR, tags=["Multi-Agent Reasoning"])
app.include_router(workbench_router, prefix=settings.API_V1_STR, tags=["Human Workbench & Feedback"])
app.include_router(infra_router, prefix=settings.API_V1_STR, tags=["Infrastructure as Code & Cloud Run"])
app.include_router(metrics_router, prefix=settings.API_V1_STR, tags=["Observability & Metrics"])
app.include_router(benchmark_router, prefix=settings.API_V1_STR, tags=["Evaluation & Benchmarks"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
