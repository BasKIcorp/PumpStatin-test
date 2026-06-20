from __future__ import annotations

import math
from typing import Any


async def interpolate_fluid(
    db: Any, med: str, c: int, t: int
) -> tuple[float, float]:
    """ТЗ 2.2 — den и Mu; шаг 5 в БД, линейная/билинейная интерполяция."""
    if med == "вода":
        row = await db.get_fluid_properties("вода", 100, t if t % 5 == 0 else 20)
        if row:
            return row["den"], row["mu"]
        return 998.0, 1.0

    def snap_down(v: int, step: int = 5) -> int:
        return (v // step) * step

    c1, c2 = snap_down(c), snap_down(c) + 5
    t1, t2 = snap_down(t), snap_down(t) + 5
    if c % 5 != 0:
        c1 = max(20, c2 - 5)
    if t % 5 != 0:
        t1 = max(5, t2 - 5)

    async def fetch(cc: int, tt: int) -> tuple[float, float] | None:
        row = await db.get_fluid_properties(med, cc, tt)
        if row:
            return row["den"], row["mu"]
        return None

    if c % 5 == 0 and t % 5 == 0:
        pt = await fetch(c, t)
        if pt:
            return pt

    if c % 5 == 0 and t % 5 != 0:
        p1 = await fetch(c, t1)
        p2 = await fetch(c, t2)
        if p1 and p2:
            den = p1[0] + (t - t1) * (p2[0] - p1[0]) / max(t2 - t1, 1)
            mu = p1[1] + (t - t1) * (p2[1] - p1[1]) / max(t2 - t1, 1)
            return den, mu

    if c % 5 != 0 and t % 5 == 0:
        p1 = await fetch(c1, t)
        p2 = await fetch(c2, t)
        if p1 and p2:
            den = p1[0] + (c - c1) * (p2[0] - p1[0]) / max(c2 - c1, 1)
            mu = p1[1] + (c - c1) * (p2[1] - p1[1]) / max(c2 - c1, 1)
            return den, mu

    corners = []
    for cc in (c1, c2):
        for tt in (t1, t2):
            pt = await fetch(cc, tt)
            if pt:
                corners.append((cc, tt, pt[0], pt[1]))
    if len(corners) >= 4:
        den11, mu11 = corners[0][2], corners[0][3]
        den21, mu21 = corners[1][2], corners[1][3]
        den12, mu12 = corners[2][2], corners[2][3]
        den22, mu22 = corners[3][2], corners[3][3]
        w = max((t2 - t1) * (c2 - c1), 1)
        den = (
            (t2 - t) * (c2 - c) / w * den11
            + (t - t1) * (c2 - c) / w * den21
            + (t2 - t) * (c - c1) / w * den12
            + (t - t1) * (c - c1) / w * den22
        )
        mu = (
            (t2 - t) * (c2 - c) / w * mu11
            + (t - t1) * (c2 - c) / w * mu21
            + (t2 - t) * (c - c1) / w * mu12
            + (t - t1) * (c - c1) / w * mu22
        )
        return den, mu

    row = await db.get_fluid_properties(med, 30, 20)
    if row:
        return row["den"], row["mu"]
    return 1040.0, 3.5
