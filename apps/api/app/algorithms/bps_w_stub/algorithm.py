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
        unit_price = int(90000 + (pump.get("power_kw") or 0) * 25000)
        working = int(parameters.get("workingPumps", 1) or 1)
        reserve = int(parameters.get("reservePumps", 0) or 0)
        total_price = unit_price * max(working + reserve, 1)
        return {
            "selectionId": str(uuid4()),
            "configuration": {
                "productLine": product_line,
                "flowId": flow_id,
                "pump": pump,
                "pumpCount": f"{working} раб. + {reserve} рез.",
                "hydraulics": {
                    "flowRate": parameters.get("flowRate"),
                    "head": parameters.get("head"),
                    "staticHead": parameters.get("staticHead"),
                    "guaranteedHead": parameters.get("guaranteedHead"),
                },
                "options": {k: v for k, v in parameters.items() if k.startswith(("pn", "control", "filter", "relief", "insulation"))},
            },
            "commercial": {
                "basePriceRub": 90000,
                "unitPriceRub": unit_price,
                "totalPriceRub": total_price,
                "currency": "RUB",
            },
            "summary": f"Станция {product_line.upper()} на базе {pump.get('name', selected_pump_id)}",
        }
