"""Изолированная SQLite-БД для pytest (до импорта app)."""

import os
import tempfile
from pathlib import Path

import pytest

TEST_DB = Path(tempfile.gettempdir()) / "pumpstation_pytest.db"

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB.as_posix()}"
os.environ["USE_MOCK_DB"] = "false"


@pytest.fixture(scope="session", autouse=True)
async def _prepare_test_database():
    if TEST_DB.exists():
        TEST_DB.unlink()
    from app.db.init_db import init_database

    await init_database()
    yield
