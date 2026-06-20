"""Golden-file тесты алгоритма bps_w_v2 — правка YAML → pytest."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.algorithms.bps_w_v2.models import SelectionInputV2
from app.algorithms.bps_w_v2.rules_loader import load_algorithm_rules
from app.algorithms.bps_w_v2.validators import validate_input
from app.core.config import PROFILES_DIR

FIXTURES = Path(__file__).parent / "fixtures"


def _load_cases():
    path = FIXTURES / "validation_cases.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", _load_cases(), ids=lambda c: c["id"])
def test_validation_golden(case: dict):
    rules = load_algorithm_rules(PROFILES_DIR / "default")
    inp = SelectionInputV2(**case["input"])
    if case.get("expect_error"):
        with pytest.raises(ValueError, match=case["expect_error"]):
            validate_input(inp, rules)
    else:
        validate_input(inp, rules)


def test_rules_version_golden():
    rules = load_algorithm_rules(PROFILES_DIR / "default")
    assert rules.get("version") == 1
    assert "pump_filters" in rules
    assert "dn" in rules
    assert "bom" in rules
