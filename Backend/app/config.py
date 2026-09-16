from functools import lru_cache
from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _coerce_bool(value: Any) -> bool:
    """Coerce common string representations of booleans into actual booleans."""
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in ("true", "1", "yes", "y", "on"):
            return True
        if lowered in ("false", "0", "no", "n", "off", "release", ""):
            return False
    return bool(value)


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str

    # App
    APP_NAME: str = "Mocky API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Groq LLM (Feature 1C: Resume Understanding)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-20b"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    @field_validator("DEBUG", mode="before")
    @classmethod
    def _coerce_debug(cls, value: Any) -> bool:
        return _coerce_bool(value)


@lru_cache
def get_settings() -> Settings:
    return Settings()