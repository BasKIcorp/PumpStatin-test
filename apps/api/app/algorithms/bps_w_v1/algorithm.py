from typing import Any
from uuid import uuid4

from app.algorithms.base import AlgorithmProtocol


class BpsWV1Algorithm:
    """
    Алгоритм подбора BPS-W v1: скоринг по отклонению Q/H от номинала.
    Замените на инженерные кривые и каталоги производителя.
    """

    name = "bps_w_v1"

    def _curve_payload(
        self, pump: dict[str, Any], flow: float, head: float
    ) -> dict[str, Any]:
        q_nom = float(pump.get("nominal_flow") or flow or 15.0)
        h_nom = float(pump.get("nominal_head") or head or 20.0)
        p_nom = float(pump.get("power_kw") or 1.5)
        q_vals = [round(q_nom * 1.45 * i / 12, 3) for i in range(13)]
        h_curve = [round(max(h_nom * (1 - 0.58 * (q / max(q_nom, 0.1)) ** 2), 0), 3) for q in q_vals]
        eta_curve = [round(max(76 - 40 * ((q / max(q_nom, 0.1)) - 1) ** 2, 20), 3) for q in q_vals]
        p2_curve = [round(max(p_nom * (0.25 + 0.8 * (q / max(q_nom, 0.1))), 0), 3) for q in q_vals]
        npsh_curve = [round(max(0.8 + 2.6 * (q / max(q_nom, 0.1)) ** 2, 0), 3) for q in q_vals]
        parabola = [round(head * (q / max(flow, 0.1)) ** 2, 3) for q in q_vals]
        return {
            "Q_base": round(flow, 3),
            "H_base": round(head, 3),
            "curve": [{"Q": q, "H": h} for q, h in zip(q_vals, h_curve)],
            "q_eta": q_vals,
            "eta_s": eta_curve,
            "q_p2": q_vals,
            "p2_s": p2_curve,
            "q_npsh": q_vals,
            "npsh_s": npsh_curve,
            "parabola": [{"Q": q, "H": h} for q, h in zip(q_vals, parabola)],
            "parabola_intersection": {"Q": round(flow, 3), "H": round(head, 3)},
            "eta_at_parabola": round(max(76 - 40 * ((flow / max(q_nom, 0.1)) - 1) ** 2, 20), 3),
            "p2_at_parabola": round(max(p_nom * (0.25 + 0.8 * (flow / max(q_nom, 0.1))), 0), 3),
            "npsh_at_parabola": round(max(0.8 + 2.6 * (flow / max(q_nom, 0.1)) ** 2, 0), 3),
            "moschnost": round(p_nom, 3),
        }

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
                    "nominal_flow": p.get("nominal_flow"),
                    "nominal_head": p.get("nominal_head"),
                    **self._curve_payload(p, flow, head),
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
        unit_price = int(120000 + (pump.get("power_kw") or 0) * 35000)
        total_count = working + reserve
        total_price = unit_price * max(total_count, 1)
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
            "commercial": {
                "basePriceRub": 120000,
                "unitPriceRub": unit_price,
                "totalPriceRub": total_price,
                "currency": "RUB",
            },
            "summary": (
                f"Насосная станция {product_line.upper()} / {pump.get('name', selected_pump_id)} "
                f"({working}+{reserve} насосов)"
            ),
        }
