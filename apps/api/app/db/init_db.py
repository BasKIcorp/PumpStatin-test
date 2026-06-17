"""Создание таблиц и демо-данных (вызывается при старте API)."""

from sqlalchemy import select

from app.db.models import Base, CatalogItemModel, PumpModel
from app.db.session import SessionLocal, engine

_SEED_PUMPS = [
    ("p1", "bps-w", "BPS-W 15/22", 15, 22, 2.2),
    ("p2", "bps-w", "BPS-W 20/25", 20, 25, 3.0),
    ("p3", "bps-w", "BPS-W 12/18", 12, 18, 1.5),
    ("p4", "bps-w", "BPS-W 30/32", 30, 32, 5.5),
]

_CATALOGS = {
    "catalog.pumpTypes": [
        ("civos", "CIVOS"),
        ("inline", "Инлайн"),
        ("end", "Консольный"),
    ],
    "catalog.fluidTypes": [("water", "Вода"), ("glycol", "Гликоль 30%")],
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


async def init_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        existing = await session.execute(select(PumpModel.id).limit(1))
        if existing.scalar_one_or_none():
            return

        for pid, line, name, flow, head, power in _SEED_PUMPS:
            session.add(
                PumpModel(
                    id=pid,
                    product_line=line,
                    name=name,
                    nominal_flow=flow,
                    nominal_head=head,
                    power_kw=power,
                )
            )
        for source, items in _CATALOGS.items():
            for value, label in items:
                session.add(
                    CatalogItemModel(source_key=source, value=value, label=label)
                )
        await session.commit()
