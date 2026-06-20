import pytest

from app.algorithms.bps_w_v2.models import SelectionInputV2
from app.algorithms.bps_w_v2.parameter_mapper import map_parameters
from app.algorithms.bps_w_v2.rules_loader import load_algorithm_rules
from app.algorithms.bps_w_v2.steps.hydraulics import find_working_point
from app.algorithms.bps_w_v2.validators import validate_input
from app.core.config import PROFILES_DIR


def test_map_legacy_parameters():
    inp = map_parameters(
        {
            "flowRate": 15,
            "head": 20,
            "workingPumps": 2,
            "reservePumps": 1,
            "pumpType": "COMOS",
            "fluidType": "вода",
            "puLine": "bps-w-pro",
        },
        mf="WL",
    )
    assert inp.Q == 15
    assert inp.H == 20
    assert inp.n1 == 2
    assert inp.station_type == "BPS-W"
    assert inp.series == "Pro"
    assert inp.mf == "WL"


def test_validation_pump_count_lite():
    rules = load_algorithm_rules(PROFILES_DIR / "default")
    inp = SelectionInputV2(
        station_type="BPS-W",
        series="Lite",
        Q=15,
        H=20,
        n1=1,
        n2=0,
        med="вода",
        c=100,
        t=20,
        pump_type="COMOS",
    )
    with pytest.raises(ValueError, match="n must be"):
        validate_input(inp, rules)


def test_find_working_point():
    qw = [0, 5, 10, 15, 20]
    hw = [25, 24, 22, 18, 12]
    wp = find_working_point(qw, hw, 15, 20, 0)
    assert wp["Q"] > 0
    assert wp["H"] > 0


def test_rules_loader_merge():
    rules = load_algorithm_rules(PROFILES_DIR / "default")
    assert rules.get("validation")
    assert rules.get("pump_filters")
    assert rules.get("version") == 1
