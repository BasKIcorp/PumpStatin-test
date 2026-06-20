from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class PumpCountRule(BaseModel):
    when: dict[str, Any]
    n: dict[str, int]


class FieldConstraints(BaseModel):
    model_config = {"extra": "allow"}


class ValidationRules(BaseModel):
    pump_count_rules: list[PumpCountRule] = Field(default_factory=list)
    field_constraints: dict[str, Any] = Field(default_factory=dict)


class FlowRangeRule(BaseModel):
    q_min_factor: float
    q_max_factor: float


class PumpFilterRules(BaseModel):
    flow_range_by_pump_type: dict[str, FlowRangeRule] = Field(default_factory=dict)
    head_tolerance: float = 0.3


class DnFormula(BaseModel):
    divisor: float


class DnRules(BaseModel):
    formulas: dict[str, DnFormula] = Field(default_factory=dict)
    round_up: str = "pipe_dn_series"


class AlgorithmRules(BaseModel):
    version: int = 1
    enabled_steps: dict[str, list[str]] = Field(default_factory=dict)
    top_n: int = 5
    manufacturer: str | None = None


def deep_merge(base: dict, override: dict) -> dict:
    out = dict(base)
    for key, val in override.items():
        if isinstance(val, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], val)
        else:
            out[key] = val
    return out


def load_yaml_dir(path: Path) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    if not path.is_dir():
        return merged
    for file in sorted(path.glob("*.yaml")):
        with file.open(encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        merged = deep_merge(merged, data)
    return merged


def load_algorithm_rules(profile_dir: Path | None) -> dict[str, Any]:
    defaults_dir = Path(__file__).resolve().parent / "defaults"
    merged = load_yaml_dir(defaults_dir)
    if profile_dir:
        algo_dir = profile_dir / "algorithm"
        if algo_dir.is_dir():
            merged = deep_merge(merged, load_yaml_dir(algo_dir))
    return merged
