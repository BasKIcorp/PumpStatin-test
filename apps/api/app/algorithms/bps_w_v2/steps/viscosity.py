from __future__ import annotations

import math
from typing import Any


def apply_viscosity_correction(
    curves: dict[str, list[float]],
    pump: dict[str, Any],
    inp_med: str,
    den: float,
    mu: float,
    rules: dict[str, Any],
) -> dict[str, list[float]]:
    """ТЗ 2.2.3 — пересчёт кривых для вязких сред."""
    if inp_med == "вода":
        return curves

    qw = curves.get("Qw") or []
    hw = curves.get("Hw") or []
    eta_w = curves.get("eta") or []
    npsh_w = curves.get("NPSH") or []
    if not qw or not hw:
        return curves

    denw = 998.0
    f = float(pump.get("frequency_rpm") or 2900)
    eta_peak = max(eta_w) if eta_w else 76.0
    idx_peak = eta_w.index(eta_peak) if eta_w else 0
    q_ver = qw[idx_peak]
    h_ver = hw[idx_peak]

    nq = f * (q_ver / 3600) ** 0.5 / max(h_ver, 0.1) ** 0.75
    vvis = mu / max(den, 1)
    re = (q_ver**2 * f) ** (1 / 3) / max(vvis, 1e-9)
    b = 16.5 / (60 * max(nq, 0.1) * max(re, 0.1) ** 0.5) ** (1 / 12)

    vis_rules = rules.get("viscosity", {})
    a_map = vis_rules.get("a_by_pump_type", {})
    pump_type = str(pump.get("pump_type") or "COMOS")
    a = float(a_map.get(pump_type, 0.5))

    if b <= 1:
        cq = 1.0
        cn = [1.0] * len(qw)
        ckpd = (1 - ((1 - eta_peak / 100) * (vvis / 1e-6) ** 0.07)) / max(eta_peak / 100, 0.01)
    elif b >= 40:
        cq = 0.9
        cn = [1.0 - 0.05 * (q / max(q_ver, 0.1)) for q in qw]
        ckpd = 0.85
    else:
        cq = 2.71 ** (-0.165 * (math.log10(max(b, 0.01)) ** 3.15))
        cn = [1 - (1 - cq) * (q / max(q_ver, 0.1)) ** 0.75 for q in qw]
        ckpd = b ** (-0.0547 * b**0.69)

    npsh_ver = npsh_w[idx_peak] if npsh_w else 1.0
    cnpsh = 1 + 274000 * a * (1 / max(cq, 0.01) - 1) * npsh_ver / (
        max(q_ver, 0.1) ** 0.667 * max(f, 1) ** 1.33
    )

    s = den / denw
    qvis = [cq * q for q in qw]
    hvis = [cn[i] * hw[i] for i in range(len(hw))]
    etavis = [ckpd * e for e in eta_w]
    npshvis = [cnpsh * n for n in npsh_w]
    pvis = [
        (qvis[i] * hvis[i] * s) / (367 * max(etavis[i], 1))
        for i in range(len(qvis))
    ]

    return {
        "Qw": qvis,
        "Hw": hvis,
        "eta": etavis,
        "NPSH": npshvis,
        "Pw": pvis,
    }
