"""Migrate wizard page.frames → flat page.blocks with props.stepId (Option C).



Usage (from repo root):

  python apps/api/app/tools/migrate_wizard_frames.py

  python apps/api/app/tools/migrate_wizard_frames.py --profile default --cards

"""



from __future__ import annotations



import argparse

import copy

import sys

from pathlib import Path



import yaml



REPO_ROOT = Path(__file__).resolve().parents[4]

PROFILES_DIR = REPO_ROOT / "config" / "profiles"



SIDEBAR_COLS = 2

CONTENT_X = 2

CONTENT_W = 10

SELECTION_CARD_COL_W = 4

CARD_PROP_KEYS = ("title", "image", "description", "next", "flow", "enabled")



WIZARD_FUNNEL_SIDEBAR = "wizard/funnel-sidebar"

WIZARD_FUNNEL_HEADING = "wizard/funnel-heading"

WIZARD_SELECTION_CARD = "wizard/selection-card"

WIZARD_SELECTION_WORK_HEADER = "wizard/selection-work-header"

WIZARD_SELECTION_PARAMS = "wizard/selection-params-panel"

WIZARD_SELECTION_CURVES = "wizard/selection-curves-panel"

WIZARD_SELECTION_TECH_SPECS = "wizard/selection-tech-specs-panel"

WIZARD_SELECTION_OPTIONS = "wizard/selection-options-panel"

WIZARD_SELECTION_RESULTS = "wizard/selection-results-panel"

WIZARD_LEGACY_SELECTION = "wizard/legacy-selection"





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

    props = block.get("props") or {}

    step_id = props.get("stepId")

    return step_id if isinstance(step_id, str) and step_id else None





def with_block_step_id(block: dict, step_id: str) -> dict:

    out = copy.deepcopy(block)

    props = out.setdefault("props", {})

    if not props.get("stepId"):

        props["stepId"] = step_id

    return out





def height_for_card_width(col_w: int) -> int:

    return max(7, round(col_w * 2 + 2))





def layout_for_card(index: int) -> dict:

    w = SELECTION_CARD_COL_W

    h = height_for_card_width(w)

    return {"x": CONTENT_X + index * w, "y": 2, "w": w, "h": h}





def card_block_id(step_id: str, card_id: str) -> str:

    return f"w-card-{step_id}-{card_id}"





def card_props_from_nav(step_id: str, card: dict) -> dict:

    props: dict = {"stepId": step_id, "cardId": card["id"]}

    for key in CARD_PROP_KEYS:

        if key in card:

            props[key] = card[key]

    return props





def uses_decomposed_strela_frames(blocks: list[dict]) -> bool:

    types = {b.get("type") for b in blocks}

    return (

        WIZARD_FUNNEL_SIDEBAR in types

        or WIZARD_FUNNEL_HEADING in types

        or WIZARD_SELECTION_CARD in types

    )





def is_strela_funnel(profile_id: str, page: dict) -> bool:

    if page.get("pageProfile") == "strela-funnel":

        return True

    branding_path = PROFILES_DIR / profile_id / "branding.yaml"

    if branding_path.is_file():

        branding = load_yaml(branding_path)

        if branding.get("layoutVariant") == "strela-funnel":

            return True

    return profile_id == "default"





def load_appearance(profile_id: str) -> dict:

    branding_path = PROFILES_DIR / profile_id / "branding.yaml"

    if not branding_path.is_file():

        return {}

    branding = load_yaml(branding_path)

    return branding.get("appearance") or {}





def build_strela_card_grid_blocks(step: dict, cards: list[dict], appearance: dict) -> list[dict]:

    step_id = step["id"]

    sidebar_id = f"w-sidebar-{step_id}"

    heading_id = f"w-fheading-{step_id}"

    blocks: list[dict] = [

        {

            "id": sidebar_id,

            "type": WIZARD_FUNNEL_SIDEBAR,

            "layout": {"x": 0, "y": 0, "w": SIDEBAR_COLS, "h": 22, "rotation": -90},

            "props": {

                "stepId": step_id,

                "sidebarText": appearance.get("sidebar_text") or "стрела",

                "wordmarkUrl": appearance.get("funnel_sidebar_wordmark_url"),

                "sidebarWidth": appearance.get("funnel_sidebar_width"),

            },

        },

        {

            "id": heading_id,

            "type": WIZARD_FUNNEL_HEADING,

            "layout": {"x": CONTENT_X, "y": 0, "w": CONTENT_W, "h": 2},

            "props": {

                "stepId": step_id,

                "title": step.get("title"),

                "subtitle": step.get("subtitle"),

            },

        },

    ]

    for index, card in enumerate(cards):

        blocks.append(

            {

                "id": card_block_id(step_id, card["id"]),

                "type": WIZARD_SELECTION_CARD,

                "layout": layout_for_card(index),

                "props": card_props_from_nav(step_id, card),

            }

        )

    return blocks





def build_simple_card_grid_blocks(step: dict) -> list[dict]:

    step_id = step["id"]

    return [

        {

            "id": f"w-heading-{step_id}",

            "type": "wizard/step-heading",

            "layout": {"x": 0, "y": 0, "w": 12, "h": 2},

            "props": {"stepId": step_id},

        },

        {

            "id": f"w-cards-{step_id}",

            "type": "wizard/card-grid-simple",

            "layout": {"x": 0, "y": 2, "w": 12, "h": 12},

            "props": {"stepId": step_id},

        },

    ]





def build_strela_selection_form_blocks(step: dict) -> list[dict]:

    step_id = step["id"]

    defaults = [

        (f"w-sel-header-{step_id}", WIZARD_SELECTION_WORK_HEADER, {"x": 0, "y": 0, "w": 12, "h": 2}),

        (f"w-sel-params-{step_id}", WIZARD_SELECTION_PARAMS, {"x": 0, "y": 2, "w": 5, "h": 9}),

        (f"w-sel-curves-{step_id}", WIZARD_SELECTION_CURVES, {"x": 5, "y": 2, "w": 4, "h": 9}),

        (f"w-sel-tech-{step_id}", WIZARD_SELECTION_TECH_SPECS, {"x": 9, "y": 2, "w": 3, "h": 9}),

        (f"w-sel-options-{step_id}", WIZARD_SELECTION_OPTIONS, {"x": 0, "y": 11, "w": 5, "h": 9}),

        (f"w-sel-results-{step_id}", WIZARD_SELECTION_RESULTS, {"x": 5, "y": 11, "w": 7, "h": 9}),

    ]

    return [

        {"id": block_id, "type": block_type, "layout": layout, "props": {"stepId": step_id}}

        for block_id, block_type, layout in defaults

    ]





def build_legacy_selection_form_blocks(step: dict) -> list[dict]:

    step_id = step["id"]

    return [

        {

            "id": f"w-form-{step_id}",

            "type": WIZARD_LEGACY_SELECTION,

            "layout": {"x": 0, "y": 0, "w": 12, "h": 24},

            "props": {"stepId": step_id},

        }

    ]





def default_frame_blocks(step: dict, strela: bool, cards: list[dict], appearance: dict) -> list[dict]:

    step_type = step.get("type")

    if step_type == "card-grid" and strela:

        return build_strela_card_grid_blocks(step, cards, appearance)

    if step_type == "card-grid":

        return build_simple_card_grid_blocks(step)

    if step_type == "selection-form" and strela:

        return build_strela_selection_form_blocks(step)

    if step_type == "selection-form":

        return build_legacy_selection_form_blocks(step)

    return []





def sync_decomposed_card_blocks(blocks: list[dict], step: dict, cards: list[dict]) -> list[dict]:

    step_id = step["id"]

    shell = [b for b in blocks if b.get("type") in (WIZARD_FUNNEL_SIDEBAR, WIZARD_FUNNEL_HEADING)]

    other = [

        b

        for b in blocks

        if b.get("type")

        not in (WIZARD_FUNNEL_SIDEBAR, WIZARD_FUNNEL_HEADING, WIZARD_SELECTION_CARD, "wizard/card-grid-strela")

    ]

    existing_cards = [b for b in blocks if b.get("type") == WIZARD_SELECTION_CARD]

    existing_by_card_id = {str((b.get("props") or {}).get("cardId")): b for b in existing_cards}



    card_blocks: list[dict] = []

    for index, card in enumerate(cards):

        card_id = card["id"]

        prev = existing_by_card_id.get(card_id)

        slot = layout_for_card(index)

        if prev:

            merged = copy.deepcopy(prev)

            merged["layout"] = {

                **slot,

                "h": (prev.get("layout") or {}).get("h", slot["h"]),

                **(

                    {"rotation": prev["layout"]["rotation"]}

                    if (prev.get("layout") or {}).get("rotation") is not None

                    else {}

                ),

                **(

                    {"crop": prev["layout"]["crop"]}

                    if (prev.get("layout") or {}).get("crop") is not None

                    else {}

                ),

            }

            props = merged.setdefault("props", {})

            props.setdefault("stepId", step_id)

            props.setdefault("cardId", card_id)

            for key in CARD_PROP_KEYS:

                if key in card and props.get(key) is None:

                    props[key] = card[key]

            card_blocks.append(merged)

        else:

            card_blocks.append(

                {

                    "id": card_block_id(step_id, card_id),

                    "type": WIZARD_SELECTION_CARD,

                    "layout": slot,

                    "props": card_props_from_nav(step_id, card),

                }

            )

    return shell + other + card_blocks





def blocks_for_step(page_blocks: list[dict], step_id: str) -> list[dict]:

    return [b for b in page_blocks if read_block_step_id(b) == step_id]





def patch_step_blocks(page_blocks: list[dict], step_id: str, step_blocks: list[dict]) -> list[dict]:

    rest = [b for b in page_blocks if read_block_step_id(b) != step_id]

    tagged = [with_block_step_id(b, step_id) for b in step_blocks]

    return rest + tagged





def flatten_wizard_frames(page: dict) -> bool:

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





def merge_cards_into_selection_blocks(page: dict, nav_cards: dict[str, list[dict]]) -> bool:

    changed = False

    for block in page.get("blocks") or []:

        if block.get("type") != WIZARD_SELECTION_CARD:

            continue

        props = block.setdefault("props", {})

        step_id = props.get("stepId")

        card_id = props.get("cardId")

        if not step_id or not card_id:

            continue

        cards = nav_cards.get(step_id) or []

        card = next((c for c in cards if c.get("id") == card_id), None)

        if not card:

            continue

        for key in CARD_PROP_KEYS:

            if key in card and props.get(key) is None:

                props[key] = card[key]

                changed = True

    return changed





def materialize_wizard_steps(

    page: dict,

    steps: list[dict],

    nav_cards: dict[str, list[dict]],

    strela: bool,

    appearance: dict,

) -> bool:

    changed = False

    blocks = list(page.get("blocks") or [])

    step_ids = {s["id"] for s in steps}



    for step in steps:

        step_id = step["id"]

        step_blocks = blocks_for_step(blocks, step_id)

        cards = nav_cards.get(step_id) or []



        if not step_blocks:

            next_blocks = default_frame_blocks(step, strela, cards, appearance)

            blocks = patch_step_blocks(blocks, step_id, next_blocks)

            changed = True

            print(f"  materialized step {step_id}: {len(next_blocks)} blocks")

            continue



        if strela and step.get("type") == "card-grid" and uses_decomposed_strela_frames(step_blocks):

            synced = sync_decomposed_card_blocks(step_blocks, step, cards)

            if synced != step_blocks:

                blocks = patch_step_blocks(blocks, step_id, synced)

                changed = True

                print(f"  synced cards for step {step_id}")



    filtered = [b for b in blocks if not read_block_step_id(b) or read_block_step_id(b) in step_ids]

    if len(filtered) != len(blocks):

        blocks = filtered

        changed = True



    page["blocks"] = blocks

    if "frames" in page:

        page.pop("frames", None)

        changed = True

    return changed





def migrate_profile(profile_id: str, *, merge_cards: bool = False) -> bool:

    site_path = PROFILES_DIR / profile_id / "site.yaml"

    if not site_path.is_file():

        print(f"skip {profile_id}: no site.yaml", file=sys.stderr)

        return False

    data = load_yaml(site_path)

    changed = False

    nav_steps: list[dict] = []

    nav_cards: dict[str, list[dict]] = {}

    nav_path = PROFILES_DIR / profile_id / "wizard" / "navigation.yaml"

    if nav_path.is_file():

        nav = load_yaml(nav_path)

        nav_steps = nav.get("steps") or []

        nav_cards = nav.get("cards") or {}



    appearance = load_appearance(profile_id)



    for page in data.get("pages") or []:

        if page.get("type") != "wizard":

            continue

        strela = is_strela_funnel(profile_id, page)

        if flatten_wizard_frames(page):

            changed = True

            print(f"  flattened frames → {len(page.get('blocks') or [])} blocks")

        if nav_steps and materialize_wizard_steps(page, nav_steps, nav_cards, strela, appearance):

            changed = True

        if merge_cards and nav_cards and merge_cards_into_selection_blocks(page, nav_cards):

            changed = True

            print("  merged nav.cards into selection-card props")



    if changed:

        dump_yaml(site_path, data)

        print(f"updated {site_path.relative_to(REPO_ROOT)}")

    else:

        print(f"no changes for {profile_id}")

    return changed





def main() -> int:

    parser = argparse.ArgumentParser(description="Migrate wizard frames to unified blocks")

    parser.add_argument("--profile", action="append", dest="profiles", help="Profile id (repeatable)")

    parser.add_argument(

        "--cards",

        action="store_true",

        help="Copy nav.cards fields into wizard/selection-card block props (missing only)",

    )

    args = parser.parse_args()

    profiles = args.profiles or [

        p.name for p in PROFILES_DIR.iterdir() if p.is_dir() and (p / "site.yaml").is_file()

    ]

    any_changed = False

    for pid in profiles:

        if pid.startswith("_"):

            continue

        print(f"migrate {pid}…")

        if migrate_profile(pid, merge_cards=args.cards):

            any_changed = True

    return 0





if __name__ == "__main__":

    raise SystemExit(main())

