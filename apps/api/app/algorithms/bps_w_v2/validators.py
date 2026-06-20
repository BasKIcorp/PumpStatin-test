from __future__ import annotations

from typing import Any

from app.algorithms.bps_w_v2.models import SelectionInputV2


def validate_input(inp: SelectionInputV2, rules: dict[str, Any]) -> None:
    validation = rules.get("validation", {})
    constraints = validation.get("field_constraints", {})
    q_rules = constraints.get("Q", {})
    if q_rules.get("gt") is not None and inp.Q <= q_rules["gt"]:
        raise ValueError("Q must be > 0")

    c_rules = constraints.get("c", {})
    med_norm = inp.med.lower()
    water_aliases = {"вода", "water"}
    if med_norm not in {str(c_rules.get("when_med_not", "")).lower()} and med_norm not in water_aliases:
        if c_rules.get("min") and inp.c < c_rules["min"]:
            raise ValueError(f"c must be >= {c_rules['min']}")
        if c_rules.get("max") and inp.c > c_rules["max"]:
            raise ValueError(f"c must be <= {c_rules['max']}")

    n_total = inp.n
    for rule in validation.get("pump_count_rules", []):
        when = rule.get("when", {})
        if not _matches_when(inp, when):
            continue
        bounds = rule.get("n", {})
        if bounds.get("min") and n_total < bounds["min"]:
            raise ValueError(f"n must be >= {bounds['min']}")
        if bounds.get("max") and n_total > bounds["max"]:
            raise ValueError(f"n must be <= {bounds['max']}")
        return
    return None


def _matches_when(inp: SelectionInputV2, when: dict[str, Any]) -> bool:
    for key, expected in when.items():
        actual = getattr(inp, key, None)
        if isinstance(expected, list):
            if actual not in expected:
                return False
        elif isinstance(expected, dict) and "not" in expected:
            if actual == expected["not"]:
                return False
        elif actual != expected:
            return False
    return True
