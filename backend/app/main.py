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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
