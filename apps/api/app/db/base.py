from typing import Any, Protocol


class DatabaseAdapter(Protocol):
    name: str

    async def get_pump_catalog(
        self, product_line: str, *, mf: str | None = None, pump_type: str | None = None
    ) -> list[dict[str, Any]]:
        ...

    async def get_pump_by_id(self, pump_id: str) -> dict[str, Any]:
        ...

    async def get_catalog(self, source: str) -> list[dict[str, Any]]:
        """Справочники для select-полей (catalog.pumpTypes и т.д.)."""
        ...

    async def get_pump_curves(self, pump_id: str) -> dict[str, list[float]]:
        ...

    async def get_fluid_properties(
        self, med: str, c: int, t: int
    ) -> dict[str, float] | None:
        ...

    async def get_pipe_dn_series(self) -> list[dict[str, float]]:
        ...

    async def get_bom_rules(
        self, station_type: str, series: str, options: dict[str, Any]
    ) -> list[dict[str, Any]]:
        ...
