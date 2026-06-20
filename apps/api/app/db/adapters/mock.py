from typing import Any

_MOCK_PUMPS = [
    {
        "id": "p1",
        "product_line": "bps-w",
        "name": "COMOS 15/22",
        "nominal_flow": 15,
        "nominal_head": 22,
        "power_kw": 2.2,
        "mf": "WL",
        "pump_type": "COMOS",
        "series": "Pro",
        "q_max": 21.75,
        "h_max": 22,
        "frequency_rpm": 2900,
    },
    {
        "id": "p2",
        "product_line": "bps-w",
        "name": "CIVOS 20/25",
        "nominal_flow": 20,
        "nominal_head": 25,
        "power_kw": 3.0,
        "mf": "WL",
        "pump_type": "CIVOS",
        "series": "Pro",
        "q_max": 29.0,
        "h_max": 25,
        "frequency_rpm": 2900,
    },
    {
        "id": "p3",
        "product_line": "bps-w",
        "name": "VMIP 12/18",
        "nominal_flow": 12,
        "nominal_head": 18,
        "power_kw": 1.5,
        "mf": "WL",
        "pump_type": "VMIP",
        "series": "Lite",
        "q_max": 17.4,
        "h_max": 18,
        "frequency_rpm": 2900,
    },
    {
        "id": "p4",
        "product_line": "bps-w",
        "name": "HMIP 30/32",
        "nominal_flow": 30,
        "nominal_head": 32,
        "power_kw": 5.5,
        "mf": "WL",
        "pump_type": "HMIP",
        "series": "Pro",
        "q_max": 43.5,
        "h_max": 32,
        "frequency_rpm": 2900,
    },
]

_MOCK_CURVES: dict[str, dict[str, list[float]]] = {
    "p1": {
        "Qw": [0, 3, 6, 9, 12, 15, 18, 21],
        "Hw": [24, 23.5, 22.8, 21.5, 19.5, 17, 14, 10],
        "eta": [0, 45, 62, 74, 78, 76, 68, 55],
        "Pw": [0, 0.8, 1.2, 1.6, 1.9, 2.1, 2.2, 2.0],
        "NPSH": [1, 1.2, 1.5, 1.9, 2.4, 3.0, 3.8, 4.5],
    },
}

_CATALOGS: dict[str, list[dict[str, Any]]] = {
    "catalog.pumpTypes": [
        {"value": "COMOS", "label": "COMOS"},
        {"value": "CIVOS", "label": "CIVOS"},
        {"value": "VMIP", "label": "VMIP"},
        {"value": "HMIP", "label": "HMIP"},
    ],
    "catalog.fluidTypes": [
        {"value": "вода", "label": "Вода"},
        {"value": "гликоль", "label": "Гликоль"},
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
    "catalog.stationTypes": [
        {"value": "BPS-W", "label": "BPS-W"},
        {"value": "BPS-C", "label": "BPS-C"},
        {"value": "FPS", "label": "FPS"},
    ],
}

_MOCK_FLUID = {
    ("вода", 100, 20): {"den": 998.0, "mu": 1.0},
    ("гликоль", 30, 20): {"den": 1040.0, "mu": 3.5},
    ("гликоль", 30, 40): {"den": 1025.0, "mu": 2.8},
}

_MOCK_DN = [
    {"dn_nominal": 50, "d_outer": 60.3, "wall_thickness": 3.0},
    {"dn_nominal": 65, "d_outer": 76.1, "wall_thickness": 3.5},
    {"dn_nominal": 80, "d_outer": 88.9, "wall_thickness": 4.0},
    {"dn_nominal": 100, "d_outer": 114.3, "wall_thickness": 4.5},
]

_MOCK_BOM = [
    {
        "name": "bps-w-pro",
        "when_json": {"station_type": "BPS-W", "series": "Pro"},
        "items_json": [
            {"id": "pump", "label": "Насос"},
            {"id": "valve", "label": "Запорная арматура"},
            {"id": "collector", "label": "Коллектор"},
        ],
    },
]


class MockDatabaseAdapter:
    name = "mock"

    async def get_pump_catalog(
        self, product_line: str, *, mf: str | None = None, pump_type: str | None = None
    ) -> list[dict[str, Any]]:
        rows = [p for p in _MOCK_PUMPS if p["product_line"] == product_line]
        if mf:
            rows = [p for p in rows if p.get("mf") == mf]
        if pump_type:
            rows = [p for p in rows if p.get("pump_type") == pump_type]
        return rows

    async def get_pump_by_id(self, pump_id: str) -> dict[str, Any]:
        for p in _MOCK_PUMPS:
            if p["id"] == pump_id:
                return dict(p)
        return {"id": pump_id, "name": "Unknown"}

    async def get_catalog(self, source: str) -> list[dict[str, Any]]:
        return list(_CATALOGS.get(source, []))

    async def get_pump_curves(self, pump_id: str) -> dict[str, list[float]]:
        base = _MOCK_CURVES.get(pump_id)
        if base:
            return base
        pump = next((p for p in _MOCK_PUMPS if p["id"] == pump_id), _MOCK_PUMPS[0])
        qn = float(pump["nominal_flow"])
        hn = float(pump["nominal_head"])
        q_vals = [round(qn * i / 7, 3) for i in range(8)]
        h_vals = [round(max(hn * (1 - 0.55 * (q / max(qn, 0.1)) ** 2), 0), 3) for q in q_vals]
        return {
            "Qw": q_vals,
            "Hw": h_vals,
            "eta": [max(76 - 40 * ((q / max(qn, 0.1)) - 1) ** 2, 20) for q in q_vals],
            "Pw": [max(float(pump.get("power_kw") or 2) * (0.3 + 0.7 * q / max(qn, 0.1)), 0) for q in q_vals],
            "NPSH": [max(0.8 + 2.5 * (q / max(qn, 0.1)) ** 2, 0) for q in q_vals],
        }

    async def get_fluid_properties(
        self, med: str, c: int, t: int
    ) -> dict[str, float] | None:
        if med == "вода":
            return {"den": 998.0, "mu": 1.0}
        return _MOCK_FLUID.get((med, c, t))

    async def get_pipe_dn_series(self) -> list[dict[str, float]]:
        return list(_MOCK_DN)

    async def get_bom_rules(
        self, station_type: str, series: str, options: dict[str, Any]
    ) -> list[dict[str, Any]]:
        out = []
        for rule in _MOCK_BOM:
            when = rule["when_json"]
            if when.get("station_type") == station_type and when.get("series") == series:
                out.append({"name": rule["name"], "items": rule["items_json"]})
        return out
