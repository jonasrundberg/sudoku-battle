"""Application configuration and settings."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # GCP Project ID (for Firestore)
    gcp_project_id: str = ""

    # Environment: development, production
    environment: str = "development"

    # CORS origins (comma-separated for production)
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Firestore emulator host (for local development)
    firestore_emulator_host: str = ""

    # WebAuthn settings
    webauthn_rp_id: str = "localhost"  # Relying Party ID (domain)
    webauthn_rp_name: str = "Sudoku Battle"
    webauthn_origin: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins into a list."""
        if self.environment == "development":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
