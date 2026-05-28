from typing import Any, Protocol


class DatabaseAdapter(Protocol):
    name: str

    async def get_pump_catalog(self, product_line: str) -> list[dict[str, Any]]:
        ...

    async def get_pump_by_id(self, pump_id: str) -> dict[str, Any]:
        ...

    async def get_catalog(self, source: str) -> list[dict[str, Any]]:
        """Справочники для select-полей (catalog.pumpTypes и т.д.)."""
        ...
