from typing import Any

from app.db.base import DatabaseAdapter

_MOCK_PUMPS = [
    {
        "id": "p1",
        "product_line": "bps-w",
        "name": "BPS-W 15/22",
        "nominal_flow": 15,
        "nominal_head": 22,
        "power_kw": 2.2,
    },
    {
        "id": "p2",
        "product_line": "bps-w",
        "name": "BPS-W 20/25",
        "nominal_flow": 20,
        "nominal_head": 25,
        "power_kw": 3.0,
    },
    {
        "id": "p3",
        "product_line": "bps-w",
        "name": "BPS-W 12/18",
        "nominal_flow": 12,
        "nominal_head": 18,
        "power_kw": 1.5,
    },
    {
        "id": "p4",
        "product_line": "bps-w",
        "name": "BPS-W 30/32",
        "nominal_flow": 30,
        "nominal_head": 32,
        "power_kw": 5.5,
    },
]

_CATALOGS: dict[str, list[dict[str, Any]]] = {
    "catalog.pumpTypes": [
        {"value": "civos", "label": "CIVOS"},
        {"value": "inline", "label": "Инлайн"},
        {"value": "end", "label": "Консольный"},
    ],
    "catalog.fluidTypes": [
        {"value": "water", "label": "Вода"},
        {"value": "glycol", "label": "Гликоль 30%"},
    ],
    "catalog.pnRatings": [
        {"value": "10", "label": "PN10"},
        {"value": "16", "label": "PN16"},
        {"value": "25", "label": "PN25"},
    ],
    "catalog.controlTypes": [
        {"value": "fc", "label": "Частотное регулирование"},
        {"value": "fix", "label": "Прямой пуск"},
    ],
    "catalog.filters": [
        {"value": "none", "label": "отсутствует"},
        {"value": "yes", "label": "Сетчатый фильтр"},
    ],
    "catalog.housings": [
        {"value": "none", "label": "отсутствует"},
        {"value": "standard", "label": "Стандартный"},
    ],
    "catalog.connections": [
        {"value": "flange", "label": "фланец"},
        {"value": "thread", "label": "Резьбовое"},
    ],
    "catalog.collectorMaterials": [
        {"value": "aisi304", "label": "AISI304"},
        {"value": "aisi316", "label": "AISI316"},
    ],
}


class MockDatabaseAdapter:
    name = "mock"

    async def get_pump_catalog(self, product_line: str) -> list[dict[str, Any]]:
        return [p for p in _MOCK_PUMPS if p["product_line"] == product_line]

    async def get_pump_by_id(self, pump_id: str) -> dict[str, Any]:
        for p in _MOCK_PUMPS:
            if p["id"] == pump_id:
                return p
        return {"id": pump_id, "name": "Unknown"}

    async def get_catalog(self, source: str) -> list[dict[str, Any]]:
        return list(_CATALOGS.get(source, []))
