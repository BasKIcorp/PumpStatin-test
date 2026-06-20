"""Seed minimal site.yaml for profiles without one."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
PROFILES_DIR = REPO_ROOT / "config" / "profiles"
DEFAULT_SITE = PROFILES_DIR / "default" / "site.yaml"

PROFILE_OVERRIDES: dict[str, dict] = {
    "acme-industrial": {"pageProfile": "topbar-dark", "cardType": "wizard/card-grid-simple"},
    "nord-minimal": {"pageProfile": "minimal-light", "cardType": "wizard/card-grid-simple"},
    "aqua-pro": {"pageProfile": "sidebar-gradient", "cardType": "wizard/card-grid-simple"},
}


def main() -> int:
    if not DEFAULT_SITE.exists():
        print("default site.yaml missing", file=sys.stderr)
        return 1
    for profile_dir in PROFILES_DIR.iterdir():
        if not profile_dir.is_dir() or profile_dir.name.startswith("_"):
            continue
        if profile_dir.name == "default":
            continue
        target = profile_dir / "site.yaml"
        if target.exists():
            print(f"Skip {target} (exists)")
            continue
        shutil.copy(DEFAULT_SITE, target)
        print(f"Copied seed to {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
