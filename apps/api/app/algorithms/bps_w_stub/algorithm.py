from typing import Any
from uuid import uuid4

from app.algorithms.base import AlgorithmProtocol


class BpsWStubAlgorithm:
    """Заглушка алгоритма BPS-W — замените реальной логикой подбора."""

    name = "bps_w_stub"

    def _curve_payload(
        self, pump: dict[str, Any], flow: float, head: float
    ) -> dict[str, Any]:
        q_nom = float(pump.get("nominal_flow") or flow or 15.0)
        h_nom = float(pump.get("nominal_head") or head or 20.0)
        p_nom = float(pump.get("power_kw") or 1.5)
        q_vals = [round(q_nom * 1.35 * i / 10, 3) for i in range(11)]
        h_curve = [round(max(h_nom * (1 - 0.6 * (q / max(q_nom, 0.1)) ** 2), 0), 3) for q in q_vals]
        eta_curve = [round(max(74 - 38 * ((q / max(q_nom, 0.1)) - 1) ** 2, 18), 3) for q in q_vals]
        p2_curve = [round(max(p_nom * (0.28 + 0.75 * (q / max(q_nom, 0.1))), 0), 3) for q in q_vals]
        npsh_curve = [round(max(0.9 + 2.2 * (q / max(q_nom, 0.1)) ** 2, 0), 3) for q in q_vals]
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
            "eta_at_parabola": round(max(74 - 38 * ((flow / max(q_nom, 0.1)) - 1) ** 2, 18), 3),
            "p2_at_parabola": round(max(p_nom * (0.28 + 0.75 * (flow / max(q_nom, 0.1))), 0), 3),
            "npsh_at_parabola": round(max(0.9 + 2.2 * (flow / max(q_nom, 0.1)) ** 2, 0), 3),
            "moschnost": round(p_nom, 3),
        }

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
                "powerKw": p.get("power_kw"),
                "nominal_flow": p.get("nominal_flow"),
                "nominal_head": p.get("nominal_head"),
                **self._curve_payload(p, flow, head),
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
