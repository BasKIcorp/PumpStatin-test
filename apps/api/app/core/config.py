from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[4]
PROFILES_DIR = REPO_ROOT / "config" / "profiles"
ACCOUNTS_DIR = REPO_ROOT / "config" / "accounts"
DATA_DIR = REPO_ROOT / "data"
WEB_PUBLIC_DIR = REPO_ROOT / "apps" / "web" / "public"
SQLITE_DB_PATH = DATA_DIR / "pumpstation.db"


def default_database_url() -> str:
    return f"sqlite+aiosqlite:///{SQLITE_DB_PATH.as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(REPO_ROOT / ".env"), extra="ignore")

    app_profile_id: str = "default"
    database_url: str = default_database_url()
    use_mock_db: bool = False  # false = данные в DATABASE_URL (SQLite или Postgres)

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    @property
    def profile_dir(self) -> Path:
        return PROFILES_DIR / self.app_profile_id


settings = Settings()
