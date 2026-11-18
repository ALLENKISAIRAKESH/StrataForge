from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise AI Deployment Engineering Platform"
    VERSION: str = "0.2.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "fde-development-secret-key-32-chars-long-secure-random"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DATABASE_URL: str = "sqlite:///./fde_platform.db"

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()
