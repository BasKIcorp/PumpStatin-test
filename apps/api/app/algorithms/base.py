from typing import Any, Protocol


class AlgorithmProtocol(Protocol):
    """Контракт алгоритма подбора — реализуйте для каждой версии/линейки."""

    name: str

    async def match_pumps(
        self,
        product_line: str,
        flow_id: str,
        parameters: dict[str, Any],
        db: Any,
    ) -> list[dict[str, Any]]:
        ...

    async def build_station(
        self,
        product_line: str,
        flow_id: str,
        parameters: dict[str, Any],
        selected_pump_id: str,
        db: Any,
    ) -> dict[str, Any]:
        ...
