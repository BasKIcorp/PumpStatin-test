"""Создание таблиц и демо-данных (вызывается при старте API)."""

from sqlalchemy import inspect, select, text

from app.db.models import (
    Base,
    BomRuleModel,
    CatalogItemModel,
    FluidPropertyModel,
    PipeDnSeriesModel,
    PumpCurvePointModel,
    PumpModel,
)
from app.db.session import SessionLocal, engine
from app.db.dialect import is_sqlite

_PUMP_V2_COLUMNS: list[tuple[str, str]] = [
    ("mf", "VARCHAR(16)"),
    ("pump_type", "VARCHAR(16)"),
    ("series", "VARCHAR(32)"),
    ("q_max", "FLOAT"),
    ("h_max", "FLOAT"),
    ("frequency_rpm", "FLOAT"),
]

_SEED_PUMPS = [
    ("p1", "bps-w", "COMOS 15/22", 15, 22, 2.2, "WL", "COMOS", "Pro", 21.75, 22, 2900),
    ("p2", "bps-w", "CIVOS 20/25", 20, 25, 3.0, "WL", "CIVOS", "Pro", 29.0, 25, 2900),
    ("p3", "bps-w", "VMIP 12/18", 12, 18, 1.5, "WL", "VMIP", "Lite", 17.4, 18, 2900),
    ("p4", "bps-w", "HMIP 30/32", 30, 32, 5.5, "WL", "HMIP", "Pro", 43.5, 32, 2900),
]

_SEED_BY_ID = {row[0]: row for row in _SEED_PUMPS}

_CATALOGS = {
    "catalog.pumpTypes": [
        ("COMOS", "COMOS"),
        ("CIVOS", "CIVOS"),
        ("VMIP", "VMIP"),
        ("HMIP", "HMIP"),
    ],
    "catalog.fluidTypes": [("вода", "Вода"), ("гликоль", "Гликоль")],
    "catalog.stationTypes": [("BPS-W", "BPS-W"), ("BPS-C", "BPS-C"), ("FPS", "FPS")],
    "catalog.pnRatings": [("10", "PN10"), ("16", "PN16"), ("25", "PN25")],
    "catalog.controlTypes": [
        ("fc", "Частотное регулирование"),
        ("fix", "Прямой пуск"),
    ],
    "catalog.filters": [("none", "отсутствует"), ("yes", "Сетчатый фильтр")],
    "catalog.housings": [("none", "отсутствует"), ("standard", "Стандартный")],
    "catalog.connections": [("flange", "фланец"), ("thread", "Резьбовое")],
    "catalog.collectorMaterials": [("aisi304", "AISI304"), ("aisi316", "AISI316")],
}

_FLUID = [
    ("вода", 100, 20, 998.0, 1.0),
    ("гликоль", 30, 20, 1040.0, 3.5),
    ("гликоль", 30, 40, 1025.0, 2.8),
]

_DN = [
    (50, 60.3, 3.0),
    (65, 76.1, 3.5),
    (80, 88.9, 4.0),
    (100, 114.3, 4.5),
    (125, 139.7, 5.0),
]


def _curve_points(pump_id: str, qn: float, hn: float, power: float) -> list[tuple]:
    rows = []
    q_vals = [round(qn * i / 7, 3) for i in range(8)]
    for i, q in enumerate(q_vals):
        h = round(max(hn * (1 - 0.55 * (q / max(qn, 0.1)) ** 2), 0), 3)
        eta = round(max(76 - 40 * ((q / max(qn, 0.1)) - 1) ** 2, 20), 3)
        pw = round(max(power * (0.3 + 0.7 * q / max(qn, 0.1)), 0), 3)
        npsh = round(max(0.8 + 2.5 * (q / max(qn, 0.1)) ** 2, 0), 3)
        rows.append((pump_id, "Qw", i, q))
        rows.append((pump_id, "Hw", i, h))
        rows.append((pump_id, "eta", i, eta))
        rows.append((pump_id, "Pw", i, pw))
        rows.append((pump_id, "NPSH", i, npsh))
    return rows


def _sync_sqlite_schema(connection) -> None:
    """Добавляет v2-колонки в существующую SQLite-БД без Alembic."""
    if not is_sqlite():
        return
    insp = inspect(connection)
    if "pumps" not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns("pumps")}
    for col, col_type in _PUMP_V2_COLUMNS:
        if col not in existing:
            connection.execute(text(f"ALTER TABLE pumps ADD COLUMN {col} {col_type}"))


async def _backfill_pump_v2_fields(session) -> None:
    result = await session.execute(select(PumpModel))
    pumps = result.scalars().all()
    if not pumps:
        return
    changed = False
    for pump in pumps:
        seed = _SEED_BY_ID.get(pump.id)
        if seed:
            _, _, _, _, _, _, mf, ptype, series, qm, hm, fr = seed
            if pump.mf is None:
                pump.mf = mf
                changed = True
            if pump.pump_type is None:
                pump.pump_type = ptype
                changed = True
            if pump.series is None:
                pump.series = series
                changed = True
            if pump.q_max is None:
                pump.q_max = qm
                changed = True
            if pump.h_max is None:
                pump.h_max = hm
                changed = True
            if pump.frequency_rpm is None:
                pump.frequency_rpm = fr
                changed = True
        elif pump.mf is None:
            pump.mf = "WL"
            changed = True
    if changed:
        await session.commit()


async def _backfill_pump_curves(session) -> None:
    """Генерирует демо-кривые для насосов без pump_curve_points."""
    result = await session.execute(select(PumpModel))
    pumps = result.scalars().all()
    if not pumps:
        return
    changed = False
    for pump in pumps:
        existing = await session.execute(
            select(PumpCurvePointModel.id)
            .where(PumpCurvePointModel.pump_id == pump.id)
            .limit(1)
        )
        if existing.scalar_one_or_none():
            continue
        flow = float(pump.nominal_flow or 15)
        head = float(pump.nominal_head or 20)
        power = float(pump.power_kw or 2.2)
        for pump_id, kind, idx, val in _curve_points(pump.id, flow, head, power):
            session.add(
                PumpCurvePointModel(
                    pump_id=pump_id,
                    curve_kind=kind,
                    point_index=idx,
                    value=val,
                )
            )
        changed = True
    if changed:
        await session.commit()


async def init_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_sync_sqlite_schema)

    async with SessionLocal() as session:
        await _backfill_pump_v2_fields(session)
        await _backfill_pump_curves(session)

        existing = await session.execute(select(PumpModel.id).limit(1))
        if existing.scalar_one_or_none():
            return

        for row in _SEED_PUMPS:
            pid, line, name, flow, head, power, mf, ptype, series, qm, hm, fr = row
            session.add(
                PumpModel(
                    id=pid,
                    product_line=line,
                    name=name,
                    nominal_flow=flow,
                    nominal_head=head,
                    power_kw=power,
                    mf=mf,
                    pump_type=ptype,
                    series=series,
                    q_max=qm,
                    h_max=hm,
                    frequency_rpm=fr,
                )
            )
            for pump_id, kind, idx, val in _curve_points(pid, flow, head, power):
                session.add(
                    PumpCurvePointModel(
                        pump_id=pump_id,
                        curve_kind=kind,
                        point_index=idx,
                        value=val,
                    )
                )

        for source, items in _CATALOGS.items():
            for value, label in items:
                session.add(
                    CatalogItemModel(source_key=source, value=value, label=label)
                )

        for med, c, t, den, mu in _FLUID:
            session.add(FluidPropertyModel(med=med, c=c, t=t, den=den, mu=mu))

        for dn, d_out, st in _DN:
            session.add(
                PipeDnSeriesModel(
                    dn_nominal=dn, d_outer=d_out, wall_thickness=st
                )
            )

        session.add(
            BomRuleModel(
                name="bps-w-pro",
                when_json={"station_type": "BPS-W", "series": "Pro"},
                items_json=[
                    {"id": "pump", "label": "Насос"},
                    {"id": "valve", "label": "Запорная арматура"},
                    {"id": "collector", "label": "Коллектор"},
                ],
            )
        )
        await session.commit()
