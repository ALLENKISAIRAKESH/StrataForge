from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()


@router.get("/health", summary="API v1 Health Check")
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "api_version": "v1",
    }
