"""Migrate acme/aqua/nord wizard to flat decomposed selection-card blocks (Option C).

Usage:
  python apps/api/app/tools/migrate_non_strela_wizard.py
  python apps/api/app/tools/migrate_non_strela_wizard.py --profile acme-industrial
"""

from __future__ import annotations

import argparse
import copy
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[4]
PROFILES_DIR = REPO_ROOT / "config" / "profiles"

WIZARD_SELECTION_CARD = "wizard/selection-card"
WIZARD_LEGACY_SELECTION = "wizard/legacy-selection"
CARD_PROP_KEYS = ("title", "image", "description", "next", "flow", "enabled")
NON_STRELA_PROFILES = ("acme-industrial", "aqua-pro", "nord-minimal")


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


def with_block_step_id(block: dict, step_id: str) -> dict:
    out = copy.deepcopy(block)
    props = out.setdefault("props", {})
    props.setdefault("stepId", step_id)
    return out


def layout_for_simple_card(index: int) -> dict:
    w = 4
    h = 8
    col = index % 3
    row = index // 3
    return {"x": col * w, "y": 2 + row * h, "w": w, "h": h}


def card_block_id(step_id: str, card_id: str) -> str:
    return f"w-card-{step_id}-{card_id}"


def card_props_from_nav(step_id: str, card: dict) -> dict:
    props: dict = {"stepId": step_id, "cardId": card["id"]}
    for key in CARD_PROP_KEYS:
        if key in card:
            props[key] = card[key]
    return props


def build_simple_decomposed(step: dict, cards: list[dict]) -> list[dict]:
    step_id = step["id"]
    blocks: list[dict] = [
        {
            "id": f"w-heading-{step_id}",
            "type": "wizard/step-heading",
            "layout": {"x": 0, "y": 0, "w": 12, "h": 2},
            "props": {
                "stepId": step_id,
                "title": step.get("title"),
                "subtitle": step.get("subtitle"),
            },
        }
    ]
    for index, card in enumerate(cards):
        blocks.append(
            {
                "id": card_block_id(step_id, card["id"]),
                "type": WIZARD_SELECTION_CARD,
                "layout": layout_for_simple_card(index),
                "props": card_props_from_nav(step_id, card),
            }
        )
    return blocks


def build_legacy_form(step: dict) -> list[dict]:
    step_id = step["id"]
    return [
        {
            "id": f"w-form-{step_id}",
            "type": WIZARD_LEGACY_SELECTION,
            "layout": {"x": 0, "y": 0, "w": 12, "h": 24},
            "props": {"stepId": step_id},
        }
    ]


def blocks_for_step(blocks: list[dict], step_id: str) -> list[dict]:
    return [b for b in blocks if read_block_step_id(b) == step_id]


def patch_step_blocks(blocks: list[dict], step_id: str, step_blocks: list[dict]) -> list[dict]:
    rest = [b for b in blocks if read_block_step_id(b) != step_id]
    tagged = [with_block_step_id(b, step_id) for b in step_blocks]
    return rest + tagged


def flatten_frames(page: dict) -> bool:
    frames = page.get("frames")
    if not frames:
        return False
    blocks = list(page.get("blocks") or [])
    for step_id, frame in frames.items():
        for block in frame.get("blocks") or []:
            blocks.append(with_block_step_id(block, step_id))
    page["blocks"] = blocks
    page.pop("frames", None)
    return True


def merge_card_props(page: dict, nav_cards: dict[str, list[dict]]) -> bool:
    changed = False
    for block in page.get("blocks") or []:
        if block.get("type") != WIZARD_SELECTION_CARD:
            continue
        props = block.setdefault("props", {})
        step_id = props.get("stepId")
        card_id = props.get("cardId")
        if not step_id or not card_id:
            continue
        nav_card = next(
            (c for c in (nav_cards.get(step_id) or []) if c.get("id") == card_id),
            None,
        )
        if not nav_card:
            continue
        for key in CARD_PROP_KEYS:
            if key in nav_card and props.get(key) is None:
                props[key] = nav_card[key]
                changed = True
    return changed


def migrate_profile(profile_id: str) -> bool:
    site_path = PROFILES_DIR / profile_id / "site.yaml"
    nav_path = PROFILES_DIR / profile_id / "wizard" / "navigation.yaml"
    if not site_path.is_file() or not nav_path.is_file():
        print(f"skip {profile_id}: missing yaml", file=sys.stderr)
        return False

    site = load_yaml(site_path)
    nav = load_yaml(nav_path)
    steps = nav.get("steps") or []
    nav_cards = nav.get("cards") or {}
    changed = False

    for page in site.get("pages") or []:
        if page.get("type") != "wizard":
            continue
        if flatten_frames(page):
            changed = True
            print(f"  flattened frames")

        blocks = list(page.get("blocks") or [])
        step_ids = {s["id"] for s in steps}

        for step in steps:
            step_id = step["id"]
            step_type = step.get("type")
            cards = nav_cards.get(step_id) or []
            current = blocks_for_step(blocks, step_id)
            has_simple = any(b.get("type") == "wizard/card-grid-simple" for b in current)

            if step_type == "card-grid" and (not current or has_simple):
                next_blocks = build_simple_decomposed(step, cards)
                blocks = patch_step_blocks(blocks, step_id, next_blocks)
                changed = True
                print(f"  decomposed step {step_id}: {len(next_blocks)} blocks")
            elif step_type == "selection-form" and not current:
                next_blocks = build_legacy_form(step)
                blocks = patch_step_blocks(blocks, step_id, next_blocks)
                changed = True
                print(f"  materialized form {step_id}")

        blocks = [b for b in blocks if not read_block_step_id(b) or read_block_step_id(b) in step_ids]
        page["blocks"] = blocks
        page.pop("frames", None)

        if merge_card_props(page, nav_cards):
            changed = True
            print("  merged card props")

    if changed:
        dump_yaml(site_path, site)
        print(f"updated {site_path.relative_to(REPO_ROOT)}")
    else:
        print(f"no changes for {profile_id}")
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", action="append", dest="profiles")
    args = parser.parse_args()
    profiles = args.profiles or list(NON_STRELA_PROFILES)
    for pid in profiles:
        print(f"migrate {pid}…")
        migrate_profile(pid)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
