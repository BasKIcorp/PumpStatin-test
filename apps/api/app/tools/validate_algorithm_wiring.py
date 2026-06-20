"""Validate algorithm/wiring.yaml against minimal schema."""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
PROFILES_DIR = REPO_ROOT / "config" / "profiles"


def validate_wiring(data: dict, path: Path) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return [f"{path}: root must be mapping"]
    if not data.get("algorithmId"):
        errors.append(f"{path}: missing algorithmId")
    if data.get("version") is None:
        errors.append(f"{path}: missing version")
    params = data.get("parameters")
    if params is not None:
        if not isinstance(params, dict):
            errors.append(f"{path}: parameters must be mapping")
        elif not params.get("schema"):
            errors.append(f"{path}: parameters.schema required")
        elif not isinstance(params.get("mapping"), dict):
            errors.append(f"{path}: parameters.mapping must be mapping")
    actions = data.get("actions")
    if actions is not None and not isinstance(actions, dict):
        errors.append(f"{path}: actions must be mapping")
    return errors


def validate_algorithm_wiring() -> int:
    errors: list[str] = []
    for profile_dir in PROFILES_DIR.iterdir():
        if not profile_dir.is_dir() or profile_dir.name.startswith("_"):
            continue
        wiring_path = profile_dir / "algorithm" / "wiring.yaml"
        if not wiring_path.exists():
            continue
        with wiring_path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f)
        errors.extend(validate_wiring(data or {}, wiring_path))
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    print("OK: algorithm wiring valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(validate_algorithm_wiring())
