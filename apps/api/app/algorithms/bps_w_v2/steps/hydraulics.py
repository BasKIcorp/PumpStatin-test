from __future__ import annotations

from typing import Any


def system_curve(q: float, h: float, hst: float, points: int = 13) -> list[dict[str, float]]:
    """ТЗ 2.2 — парабола через (0, Hст) и (Q, H)."""
    if q <= 0:
        return [{"Q": 0, "H": hst}]
    k = (h - hst) / (q * q)
    qs = [q * i / (points - 1) for i in range(points)]
    return [{"Q": round(qi, 4), "H": round(hst + k * qi * qi, 4)} for qi in qs]


def interpolate_curve(q_vals: list[float], y_vals: list[float], q_target: float) -> float:
    if not q_vals or not y_vals:
        return 0.0
    if q_target <= q_vals[0]:
        return y_vals[0]
    if q_target >= q_vals[-1]:
        return y_vals[-1]
    for i in range(len(q_vals) - 1):
        if q_vals[i] <= q_target <= q_vals[i + 1]:
            t = (q_target - q_vals[i]) / max(q_vals[i + 1] - q_vals[i], 1e-9)
            return y_vals[i] + t * (y_vals[i + 1] - y_vals[i])
    return y_vals[-1]


def find_working_point(
    qw: list[float],
    hw: list[float],
    q_demand: float,
    h_demand: float,
    hst: float,
) -> dict[str, float]:
    """Пересечение кривой насоса и системы."""
    if not qw or not hw:
        return {"Q": q_demand, "H": h_demand}
    if q_demand <= 0:
        return {"Q": 0, "H": hst}
    k = (h_demand - hst) / (q_demand * q_demand)

    best_q = qw[0]
    best_err = float("inf")
    for q in qw:
        h_sys = hst + k * q * q
        h_pump = interpolate_curve(qw, hw, q)
        err = abs(h_sys - h_pump)
        if err < best_err:
            best_err = err
            best_q = q

    h_wp = interpolate_curve(qw, hw, best_q)
    return {"Q": round(best_q, 4), "H": round(h_wp, 4)}


def build_curve_payload(
    curves: dict[str, list[float]],
    wp: dict[str, float],
    q_demand: float,
    h_demand: float,
    hst: float,
    n1: int = 1,
) -> dict[str, Any]:
    qw = curves.get("Qw") or []
    hw = curves.get("Hw") or []
    eta = curves.get("eta") or []
    pw = curves.get("Pw") or []
    npsh = curves.get("NPSH") or []

    q_mult = [q * n1 for q in qw] if n1 > 1 else qw
    parabola = system_curve(q_demand, h_demand, hst)

    return {
        "curve": [{"Q": q, "H": h} for q, h in zip(qw, hw)],
        "q_eta": q_mult,
        "eta_s": eta,
        "q_p2": q_mult,
        "p2_s": pw,
        "q_npsh": q_mult,
        "npsh_s": npsh,
        "parabola": parabola,
        "parabola_intersection": wp,
        "eta_at_parabola": interpolate_curve(qw, eta, wp["Q"]) if eta else None,
        "p2_at_parabola": interpolate_curve(qw, pw, wp["Q"]) if pw else None,
        "npsh_at_parabola": interpolate_curve(qw, npsh, wp["Q"]) if npsh else None,
    }
