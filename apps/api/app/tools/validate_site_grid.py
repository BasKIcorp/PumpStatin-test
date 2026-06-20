"""Validate site.yaml grid layout for all profiles."""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
PROFILES_DIR = REPO_ROOT / "config" / "profiles"
DEFAULT_COLS = 12


def _validate_block(block: dict, *, page_id: str, idx: int) -> list[str]:
    errors: list[str] = []
    bid = block.get("id", f"#{idx}")
    if not block.get("type"):
        errors.append(f"page {page_id} block {bid}: missing type")
    layout = block.get("layout")
    if layout is None:
        return errors
    if not isinstance(layout, dict):
        errors.append(f"page {page_id} block {bid}: layout must be object")
        return errors
    for key in ("x", "y", "w", "h"):
        if key not in layout:
            errors.append(f"page {page_id} block {bid}: layout missing {key}")
    x, w = layout.get("x"), layout.get("w")
    if isinstance(x, int) and isinstance(w, int):
        if x < 0 or w < 1:
            errors.append(f"page {page_id} block {bid}: invalid x/w")
        if x + w > DEFAULT_COLS:
            errors.append(f"page {page_id} block {bid}: x+w={x + w} exceeds {DEFAULT_COLS}")
    return errors


def validate_site_grid() -> int:
    errors: list[str] = []
    for profile_dir in PROFILES_DIR.iterdir():
        if not profile_dir.is_dir() or profile_dir.name.startswith("_"):
            continue
        site_path = profile_dir / "site.yaml"
        if not site_path.exists():
            continue
        with site_path.open(encoding="utf-8") as f:
            site = yaml.safe_load(f) or {}
        pages = site.get("pages") or []
        for page in pages:
            pid = page.get("id", "?")
            for i, block in enumerate(page.get("blocks") or []):
                errors.extend(_validate_block(block, page_id=pid, idx=i))
            frames = page.get("frames") or {}
            for frame_id, frame in frames.items():
                for i, block in enumerate((frame or {}).get("blocks") or []):
                    errors.extend(
                        _validate_block(block, page_id=f"{pid}/{frame_id}", idx=i)
                    )
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    print("OK: site grid layouts valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(validate_site_grid())
