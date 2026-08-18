from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    env: str = "local"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000"

    # Database
    database_url: str = "postgresql+asyncpg://crm:crm@localhost:5432/crm"

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    jwt_secret: str = "change-me-in-.env"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 7

    # Google Sheets sync (Phase 8 — placeholders for now)
    google_sheets_credentials_json: str = ""
    google_sheets_spreadsheet_id: str = ""

    # In-app messaging — attachments are stored as bytes in Postgres (see
    # app/models/messaging.py for the tradeoff), so this cap also bounds row/
    # TOAST size, not just upload time. Raise it only alongside a move to
    # real object storage (S3/R2/etc).
    messaging_max_file_size_mb: int = 8

    @property
    def messaging_max_file_size_bytes(self) -> int:
        return self.messaging_max_file_size_mb * 1024 * 1024

    @field_validator("database_url")
    @classmethod
    def _coerce_asyncpg_scheme(cls, v: str) -> str:
        # Managed Postgres hosts (Railway, Render, Heroku-style) inject
        # DATABASE_URL as "postgres://" or "postgresql://" (psycopg2
        # convention) — SQLAlchemy's async engine here needs the
        # "postgresql+asyncpg://" driver scheme, so normalize instead of
        # requiring every host's env var to be hand-edited to match.
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://") :]
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://") :]
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
