from __future__ import annotations

import math
from typing import Any

from app.algorithms.bps_w_v2.models import SelectionInputV2


async def calculate_dn(
    inp: SelectionInputV2, db: Any, rules: dict[str, Any]
) -> dict[str, float]:
    """ТЗ 2.3.1 — диаметр коллектора."""
    dn_rules = rules.get("dn", {})
    formulas = dn_rules.get("formulas", {})
    st_key = inp.station_type
    formula = formulas.get(st_key) or formulas.get("BPS-W") or {"divisor": 1350}
    divisor = float(formula.get("divisor", 1350))
    dn_raw = 1000 * math.sqrt(inp.Q / (divisor * math.pi))

    series_rows = await db.get_pipe_dn_series()
    dn_selected = dn_raw
    d_outer = dn_raw
    wall = 3.0
    for row in sorted(series_rows, key=lambda r: r["dn_nominal"]):
        d_in = row["d_outer"] - 2 * row["wall_thickness"]
        if dn_raw <= d_in:
            dn_selected = row["dn_nominal"]
            d_outer = row["d_outer"]
            wall = row["wall_thickness"]
            break
    else:
        if series_rows:
            last = series_rows[-1]
            dn_selected = last["dn_nominal"]
            d_outer = last["d_outer"]
            wall = last["wall_thickness"]

    d_inner = (d_outer - 2 * wall) / 1000
    velocity = inp.Q / (900 * math.pi * max(d_inner, 0.001) ** 2)
    return {
        "DN": round(dn_selected, 2),
        "D_outer": round(d_outer, 2),
        "velocity": round(velocity, 3),
    }
