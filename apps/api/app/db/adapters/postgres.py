from typing import Any

from sqlalchemy import select

from app.db.models import CatalogItemModel, PumpModel
from app.db.session import SessionLocal


class PostgresDatabaseAdapter:
    name = "postgres"

    async def get_pump_catalog(self, product_line: str) -> list[dict[str, Any]]:
        async with SessionLocal() as session:
            result = await session.execute(
                select(PumpModel).where(PumpModel.product_line == product_line)
            )
            rows = result.scalars().all()
            return [
                {
                    "id": r.id,
                    "name": r.name,
                    "nominal_flow": r.nominal_flow,
                    "nominal_head": r.nominal_head,
                    "power_kw": r.power_kw,
                }
                for r in rows
            ]

    async def get_pump_by_id(self, pump_id: str) -> dict[str, Any]:
        async with SessionLocal() as session:
            row = await session.get(PumpModel, pump_id)
            if not row:
                return {"id": pump_id, "name": "Unknown"}
            return {
                "id": row.id,
                "name": row.name,
                "nominal_flow": row.nominal_flow,
                "nominal_head": row.nominal_head,
                "power_kw": row.power_kw,
            }

    async def get_catalog(self, source: str) -> list[dict[str, Any]]:
        async with SessionLocal() as session:
            result = await session.execute(
                select(CatalogItemModel).where(CatalogItemModel.source_key == source)
            )
            return [
                {"value": r.value, "label": r.label} for r in result.scalars().all()
            ]
