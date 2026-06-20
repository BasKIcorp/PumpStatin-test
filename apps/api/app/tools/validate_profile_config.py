"""Validate profile YAML configs."""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
PROFILES_DIR = REPO_ROOT / "config" / "profiles"


def validate_profiles() -> int:
    errors: list[str] = []
    for profile_dir in PROFILES_DIR.iterdir():
        if not profile_dir.is_dir() or profile_dir.name.startswith("_"):
            continue
        profile_yaml = profile_dir / "profile.yaml"
        if profile_yaml.exists():
            with profile_yaml.open(encoding="utf-8") as f:
                data = yaml.safe_load(f)
            if not data.get("id"):
                errors.append(f"{profile_yaml}: missing id")
        algo_dir = profile_dir / "algorithm"
        if algo_dir.is_dir():
            for f in algo_dir.glob("*.yaml"):
                try:
                    with f.open(encoding="utf-8") as fh:
                        yaml.safe_load(fh)
                except yaml.YAMLError as e:
                    errors.append(f"{f}: {e}")
        registry = profile_dir / "blocks" / "registry.yaml"
        if registry.exists():
            with registry.open(encoding="utf-8") as f:
                reg = yaml.safe_load(f)
            if not isinstance(reg, dict) or "blocks" not in reg:
                errors.append(f"{registry}: expected blocks list")
        pdf_tpl = profile_dir / "pdf" / "template.json"
        if pdf_tpl.exists():
            import json

            with pdf_tpl.open(encoding="utf-8") as f:
                tpl = json.load(f)
            if "blocks" not in tpl:
                errors.append(f"{pdf_tpl}: missing blocks")
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    print("OK: profile configs valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(validate_profiles())
