from __future__ import annotations

from typing import Any

from app.algorithms.bps_w_v2.models import SelectionInputV2


def passes_pump_filter(
    inp: SelectionInputV2,
    pump: dict[str, Any],
    wp: dict[str, float],
    rules: dict[str, Any],
) -> bool:
    """ТЗ 2.2.5 — отсев по Qm и напору."""
    filters = rules.get("pump_filters", {})
    ranges = filters.get("flow_range_by_pump_type", {})
    pump_type = str(pump.get("pump_type") or inp.pump_type).upper()
    range_rule = ranges.get(pump_type) or ranges.get("COMOS")
    if not range_rule:
        return True

    qm = float(pump.get("q_max") or pump.get("nominal_flow", 0) * 1.45)
    q_wp = wp.get("Q", inp.Q)
    q_min = range_rule["q_min_factor"] * qm
    q_max = range_rule["q_max_factor"] * qm
    if not (q_min <= q_wp <= q_max):
        return False

    h_wp = wp.get("H", inp.H)
    if h_wp <= 0:
        return False
    head_tol = float(filters.get("head_tolerance", 0.3))
    if (1 - inp.H / h_wp) > head_tol:
        return False
    return True


def score_pump(pump: dict[str, Any], inp: SelectionInputV2, wp: dict[str, float]) -> float:
    q_dev = abs(wp.get("Q", inp.Q) - inp.Q) / max(inp.Q, 0.1)
    h_dev = abs(wp.get("H", inp.H) - inp.H) / max(inp.H, 0.1)
    nom_q = float(pump.get("nominal_flow") or inp.Q)
    nom_h = float(pump.get("nominal_head") or inp.H)
    catalog_dev = abs(nom_q - inp.Q) / max(inp.Q, 0.1) * 0.2 + abs(nom_h - inp.H) / max(
        inp.H, 0.1
    ) * 0.2
    return q_dev * 0.4 + h_dev * 0.4 + catalog_dev
