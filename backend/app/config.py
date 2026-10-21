"""Aventra backend configuration."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Legacy Gemini key — kept so existing .env files without it don't error
    gemini_api_key: str = ""

    # Groq
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    database_url: str = "sqlite:///./aventra.db"
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
