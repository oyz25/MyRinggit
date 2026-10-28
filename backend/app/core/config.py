from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration, loaded from the .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database (Supabase Postgres)
    database_url: str

    # JWT auth
    jwt_secret_key: str = "c1a116e457eb2357a916585a45e3497c7a80dfd18cb037d29f441a13e40a79c6"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # CORS
    cors_origins: str = "http://127.0.0.1:5500,http://localhost:5500"

    @field_validator("database_url")
    @classmethod
    def use_psycopg2_driver(cls, v: str) -> str:
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg2://" + v[len(prefix):]
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()