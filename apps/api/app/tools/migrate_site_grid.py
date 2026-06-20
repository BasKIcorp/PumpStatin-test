"""Add default grid layout to site.yaml blocks missing layout."""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
PROFILES_DIR = REPO_ROOT / "config" / "profiles"

TYPE_HEIGHT: dict[str, int] = {
    "hero": 8,
    "divider": 1,
    "rich-text": 4,
    "card-grid": 6,
    "product-grid": 8,
    "contact-form": 8,
    "map": 6,
    "auth/brand-panel": 16,
    "auth/login-form": 8,
    "wizard/legacy-selection": 20,
}


def default_layout(block_type: str, index: int) -> dict:
    h = TYPE_HEIGHT.get(block_type, 4)
    return {"x": 0, "y": index * h, "w": 12, "h": h}


def migrate_block(block: dict, index: int) -> dict:
    if block.get("layout"):
        return block
    b = dict(block)
    b["layout"] = default_layout(str(block.get("type", "")), index)
    return b


def migrate_site(data: dict) -> dict:
    site = dict(data)
    pages = []
    for page in site.get("pages") or []:
        p = dict(page)
        if p.get("blocks"):
            p["blocks"] = [migrate_block(b, i) for i, b in enumerate(p["blocks"])]
        frames = p.get("frames")
        if frames:
            new_frames = {}
            for fid, frame in frames.items():
                f = dict(frame or {})
                f["blocks"] = [
                    migrate_block(b, i) for i, b in enumerate(f.get("blocks") or [])
                ]
                new_frames[fid] = f
            p["frames"] = new_frames
        pages.append(p)
    site["pages"] = pages
    return site


def main() -> int:
    for profile_dir in PROFILES_DIR.iterdir():
        if not profile_dir.is_dir() or profile_dir.name.startswith("_"):
            continue
        site_path = profile_dir / "site.yaml"
        if not site_path.exists():
            continue
        with site_path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        migrated = migrate_site(data)
        with site_path.open("w", encoding="utf-8") as f:
            yaml.dump(migrated, f, allow_unicode=True, sort_keys=False)
        print(f"Migrated {site_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
