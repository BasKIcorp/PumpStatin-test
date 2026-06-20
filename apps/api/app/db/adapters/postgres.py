from typing import Any

from sqlalchemy import and_, select

from app.db.models import (
    BomRuleModel,
    CatalogItemModel,
    FluidPropertyModel,
    PipeDnSeriesModel,
    PumpCurvePointModel,
    PumpModel,
)
from app.db.session import SessionLocal


def _pump_dict(row: PumpModel) -> dict[str, Any]:
    return {
        "id": row.id,
        "name": row.name,
        "nominal_flow": row.nominal_flow,
        "nominal_head": row.nominal_head,
        "power_kw": row.power_kw,
        "mf": row.mf,
        "pump_type": row.pump_type,
        "series": row.series,
        "q_max": row.q_max or row.nominal_flow * 1.45,
        "h_max": row.h_max or row.nominal_head,
        "frequency_rpm": row.frequency_rpm or 2900,
    }


class PostgresDatabaseAdapter:
    name = "postgres"

    async def get_pump_catalog(
        self, product_line: str, *, mf: str | None = None, pump_type: str | None = None
    ) -> list[dict[str, Any]]:
        async with SessionLocal() as session:
            q = select(PumpModel).where(PumpModel.product_line == product_line)
            if mf:
                q = q.where(PumpModel.mf == mf)
            if pump_type:
                q = q.where(PumpModel.pump_type == pump_type)
            result = await session.execute(q)
            return [_pump_dict(r) for r in result.scalars().all()]

    async def get_pump_by_id(self, pump_id: str) -> dict[str, Any]:
        async with SessionLocal() as session:
            row = await session.get(PumpModel, pump_id)
            if not row:
                return {"id": pump_id, "name": "Unknown"}
            return _pump_dict(row)

    async def get_catalog(self, source: str) -> list[dict[str, Any]]:
        async with SessionLocal() as session:
            result = await session.execute(
                select(CatalogItemModel).where(CatalogItemModel.source_key == source)
            )
            return [
                {"value": r.value, "label": r.label} for r in result.scalars().all()
            ]

    async def get_pump_curves(self, pump_id: str) -> dict[str, list[float]]:
        async with SessionLocal() as session:
            result = await session.execute(
                select(PumpCurvePointModel)
                .where(PumpCurvePointModel.pump_id == pump_id)
                .order_by(PumpCurvePointModel.curve_kind, PumpCurvePointModel.point_index)
            )
            curves: dict[str, list[float]] = {}
            for row in result.scalars().all():
                curves.setdefault(row.curve_kind, []).append(row.value)
            return curves

    async def get_fluid_properties(
        self, med: str, c: int, t: int
    ) -> dict[str, float] | None:
        async with SessionLocal() as session:
            result = await session.execute(
                select(FluidPropertyModel).where(
                    and_(
                        FluidPropertyModel.med == med,
                        FluidPropertyModel.c == c,
                        FluidPropertyModel.t == t,
                    )
                )
            )
            row = result.scalar_one_or_none()
            if not row:
                return None
            return {"den": row.den, "mu": row.mu}

    async def get_pipe_dn_series(self) -> list[dict[str, float]]:
        async with SessionLocal() as session:
            result = await session.execute(
                select(PipeDnSeriesModel).order_by(PipeDnSeriesModel.dn_nominal)
            )
            return [
                {
                    "dn_nominal": r.dn_nominal,
                    "d_outer": r.d_outer,
                    "wall_thickness": r.wall_thickness,
                }
                for r in result.scalars().all()
            ]

    async def get_bom_rules(
        self, station_type: str, series: str, options: dict[str, Any]
    ) -> list[dict[str, Any]]:
        async with SessionLocal() as session:
            result = await session.execute(select(BomRuleModel))
            matched: list[dict[str, Any]] = []
            for row in result.scalars().all():
                when = row.when_json or {}
                if when.get("station_type") and when["station_type"] != station_type:
                    continue
                if when.get("series") and when["series"] != series:
                    continue
                matched.append({"name": row.name, "items": row.items_json})
            return matched
