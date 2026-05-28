from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]
PROFILES_DIR = REPO_ROOT / "config" / "profiles"
ACCOUNTS_DIR = REPO_ROOT / "config" / "accounts"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(REPO_ROOT / ".env"), extra="ignore")

    app_profile_id: str = "default"
    database_url: str = "postgresql+asyncpg://pump:pump@localhost:5432/pumpstation"
    use_mock_db: bool = True  # true = mock без Postgres (локальная разработка)

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    @property
    def profile_dir(self) -> Path:
        return PROFILES_DIR / self.app_profile_id


settings = Settings()
