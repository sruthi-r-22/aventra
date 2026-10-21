"""Aventra backend configuration."""
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Legacy Gemini key — kept so existing .env files without it don't error
    gemini_api_key: str = ""

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    database_url: str = "sqlite:///./aventra.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_cors_origins(self) -> List[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
