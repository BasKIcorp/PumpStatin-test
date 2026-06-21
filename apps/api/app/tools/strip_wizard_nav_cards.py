"""Remove nav.cards entries backed by wizard/selection-card block props (Option C6).

Usage (from repo root):
  python apps/api/app/tools/strip_wizard_nav_cards.py --profile default
  python apps/api/app/tools/strip_wizard_nav_cards.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
PROFILES_DIR = REPO_ROOT / "config" / "profiles"
WIZARD_SELECTION_CARD = "wizard/selection-card"


def load_yaml(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def dump_yaml(path: Path, data: dict) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as f:
        yaml.dump(
            data,
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            width=120,
        )


def read_block_step_id(block: dict) -> str | None:
    value = (block.get("props") or {}).get("stepId")
    return value if isinstance(value, str) and value else None


def steps_fully_backed_by_blocks(page: dict) -> set[str]:
    """Step ids where every selection-card block has a title in props."""
    by_step: dict[str, list[dict]] = {}
    for block in page.get("blocks") or []:
        if block.get("type") != WIZARD_SELECTION_CARD:
            continue
        step_id = read_block_step_id(block)
        if step_id:
            by_step.setdefault(step_id, []).append(block)

    backed: set[str] = set()
    for step_id, blocks in by_step.items():
        if blocks and all((b.get("props") or {}).get("title") for b in blocks):
            backed.add(step_id)
    return backed


def strip_profile(profile_id: str, *, dry_run: bool = False) -> bool:
    site_path = PROFILES_DIR / profile_id / "site.yaml"
    nav_path = PROFILES_DIR / profile_id / "wizard" / "navigation.yaml"
    if not site_path.is_file() or not nav_path.is_file():
        print(f"skip {profile_id}: missing site.yaml or navigation.yaml", file=sys.stderr)
        return False

    site = load_yaml(site_path)
    nav = load_yaml(nav_path)
    cards = dict(nav.get("cards") or {})

    wizard_page = next((p for p in (site.get("pages") or []) if p.get("type") == "wizard"), None)
    if not wizard_page:
        print(f"skip {profile_id}: no wizard page")
        return False

    backed = steps_fully_backed_by_blocks(wizard_page)
    if not backed:
        print(f"no backed steps in {profile_id}")
        return False

    removed: list[str] = []
    for step_id in list(cards.keys()):
        if step_id in backed:
            del cards[step_id]
            removed.append(step_id)

    if not removed:
        print(f"no changes for {profile_id}")
        return False

    print(f"{profile_id}: removed nav.cards for steps: {', '.join(sorted(removed))}")
    if dry_run:
        return True

    nav["cards"] = cards
    dump_yaml(nav_path, nav)
    print(f"updated {nav_path.relative_to(REPO_ROOT)}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Strip nav.cards backed by block props")
    parser.add_argument("--profile", action="append", dest="profiles")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    profiles = args.profiles or [
        p.name for p in PROFILES_DIR.iterdir() if p.is_dir() and (p / "site.yaml").is_file()
    ]
    for pid in profiles:
        if pid.startswith("_"):
            continue
        strip_profile(pid, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
