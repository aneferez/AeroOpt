from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AeroOpt API"
    api_v1_prefix: str = "/api/v1"
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite:///./aeroopt.db"
    redis_url: str | None = None
    jwt_secret: str = "development-only-change-me-please-32-chars"
    access_token_minutes: int = 15
    refresh_token_days: int = 30
    cors_origins: list[str] | str = ["http://localhost:3000"]
    rate_limit_per_minute: int = 120
    cookie_secure: bool = False
    allow_demo_provider: bool = True
    flight_provider: Literal["auto", "amadeus", "demo"] = "auto"
    amadeus_base_url: str = "https://test.api.amadeus.com"
    amadeus_client_id: str | None = None
    amadeus_client_secret: str | None = None
    openai_api_key: str | None = None
    openai_model: str = "gpt-5-mini"
    cache_ttl_seconds: int = Field(default=300, ge=30, le=1800)
    persist_search_offers: bool = False
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("jwt_secret")
    @classmethod
    def require_secure_production_secret(cls, value: str, info) -> str:
        environment = info.data.get("environment")
        if environment == "production" and len(value) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 characters in production")
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def email_alerts_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from_email)


@lru_cache
def get_settings() -> Settings:
    return Settings()
