from app.core.config import settings


def database_mode() -> str:
    if settings.use_mock_db:
        return "mock"
    if settings.database_url.startswith("sqlite"):
        return "sqlite"
    return "postgres"


def is_sqlite() -> bool:
    return settings.database_url.startswith("sqlite")


def is_editable_database() -> bool:
    return not settings.use_mock_db
