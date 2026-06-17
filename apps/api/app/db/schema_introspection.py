from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.dialect import is_sqlite


async def list_tables_with_columns(session: AsyncSession) -> list[dict[str, Any]]:
    if is_sqlite():
        return await _sqlite_tables(session)
    return await _postgres_tables(session)


async def _sqlite_tables(session: AsyncSession) -> list[dict[str, Any]]:
    table_rows = await session.execute(
        text(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            """
        )
    )
    tables: list[dict[str, Any]] = []
    for (table_name,) in table_rows.all():
        columns_rows = await session.execute(text(f'PRAGMA table_info("{table_name}")'))
        tables.append(
            {
                "name": table_name,
                "columns": [
                    {
                        "name": row[1],
                        "type": row[2],
                        "nullable": row[3] == 0,
                        "primary_key": row[5] == 1,
                    }
                    for row in columns_rows.all()
                ],
            }
        )
    return tables


async def _postgres_tables(session: AsyncSession) -> list[dict[str, Any]]:
    table_rows = await session.execute(
        text(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
            """
        )
    )
    tables: list[dict[str, Any]] = []
    for (table_name,) in table_rows.all():
        columns_rows = await session.execute(
            text(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = :table_name
                ORDER BY ordinal_position
                """
            ),
            {"table_name": table_name},
        )
        pk_rows = await session.execute(
            text(
                """
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.table_schema='public'
                  AND tc.table_name=:table_name
                  AND tc.constraint_type='PRIMARY KEY'
                """
            ),
            {"table_name": table_name},
        )
        pk_cols = {name for (name,) in pk_rows.all()}
        tables.append(
            {
                "name": table_name,
                "columns": [
                    {
                        "name": c_name,
                        "type": c_type,
                        "nullable": is_nullable == "YES",
                        "primary_key": c_name in pk_cols,
                    }
                    for (c_name, c_type, is_nullable) in columns_rows.all()
                ],
            }
        )
    return tables
