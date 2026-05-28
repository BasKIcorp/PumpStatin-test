from typing import Any
from uuid import uuid4

from app.algorithms.base import AlgorithmProtocol


class BpsWV1Algorithm:
    """
    Алгоритм подбора BPS-W v1: скоринг по отклонению Q/H от номинала.
    Замените на инженерные кривые и каталоги производителя.
    """

    name = "bps_w_v1"

    def _score(self, pump: dict[str, Any], flow: float, head: float) -> float:
        q_dev = abs(pump.get("nominal_flow", 0) - flow) / max(flow, 0.1)
        h_dev = abs(pump.get("nominal_head", 0) - head) / max(head, 0.1)
        return q_dev * 0.6 + h_dev * 0.4

    async def match_pumps(
        self,
        product_line: str,
        flow_id: str,
        parameters: dict[str, Any],
        db: Any,
    ) -> list[dict[str, Any]]:
        flow = float(parameters.get("flowRate", 15))
        head = float(parameters.get("head", 20))
        catalog = await db.get_pump_catalog(product_line)
        ranked = sorted(
            [
                {
                    "id": p["id"],
                    "name": p["name"],
                    "score": round(self._score(p, flow, head), 4),
                    "powerKw": p.get("power_kw"),
                }
                for p in catalog
            ],
            key=lambda x: x["score"],
        )
        return ranked[:5]

    async def build_station(
        self,
        product_line: str,
        flow_id: str,
        parameters: dict[str, Any],
        selected_pump_id: str,
        db: Any,
    ) -> dict[str, Any]:
        pump = await db.get_pump_by_id(selected_pump_id)
        working = int(parameters.get("workingPumps", 1))
        reserve = int(parameters.get("reservePumps", 0))
        options = {
            k: parameters[k]
            for k in parameters
            if k
            in (
                "pn",
                "control",
                "filter",
                "connection",
                "reliefValve",
                "vibrationMounts",
                "insulation",
                "expansionTank",
            )
        }
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
                "options": options,
            },
            "summary": (
                f"Насосная станция {product_line.upper()} / {pump.get('name', selected_pump_id)} "
                f"({working}+{reserve} насосов)"
            ),
        }
