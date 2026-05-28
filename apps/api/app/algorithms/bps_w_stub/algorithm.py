from typing import Any
from uuid import uuid4

from app.algorithms.base import AlgorithmProtocol


class BpsWStubAlgorithm:
    """Заглушка алгоритма BPS-W — замените реальной логикой подбора."""

    name = "bps_w_stub"

    async def match_pumps(
        self,
        product_line: str,
        flow_id: str,
        parameters: dict[str, Any],
        db: Any,
    ) -> list[dict[str, Any]]:
        catalog = await db.get_pump_catalog(product_line)
        flow = float(parameters.get("flowRate", 15))
        head = float(parameters.get("head", 20))
        return [
            {
                "id": p["id"],
                "name": p["name"],
                "score": abs(p.get("nominal_flow", 20) - flow)
                + abs(p.get("nominal_head", 25) - head),
            }
            for p in catalog[:3]
        ]

    async def build_station(
        self,
        product_line: str,
        flow_id: str,
        parameters: dict[str, Any],
        selected_pump_id: str,
        db: Any,
    ) -> dict[str, Any]:
        pump = await db.get_pump_by_id(selected_pump_id)
        return {
            "selectionId": str(uuid4()),
            "configuration": {
                "productLine": product_line,
                "flowId": flow_id,
                "pump": pump,
                "options": {k: v for k, v in parameters.items() if k.startswith(("pn", "control", "filter", "relief", "insulation"))},
            },
            "summary": f"Станция {product_line.upper()} на базе {pump.get('name', selected_pump_id)}",
        }
