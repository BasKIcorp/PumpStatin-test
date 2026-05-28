"""Extract .selection-* rules from reference source.css into strela-funnel.css."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "apps/web/public/reference/source.css"
OUT = ROOT / "apps/web/src/styles/strela-funnel.css"

ROOT_VARS = """
@import url("https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap");

:root {
  --funnel-primary: #13347f;
  --funnel-accent: #0ea5e9;
  --funnel-page-bg: #ffffff;
  --funnel-surface: #ffffff;
  --funnel-card-media-bg: #eff0f9;
  --funnel-font-heading: "Open Sans", system-ui, sans-serif;
  --funnel-font-body: "Open Sans", system-ui, sans-serif;
  --funnel-text: #0f172a;
  --funnel-text-muted: #64748b;
  --funnel-panel-header-bg: #3d3846;
  --funnel-panel-header-text: #ffffff;
  --funnel-button-bg: #a51d2d;
  --funnel-button-text: #ffffff;
  --funnel-button-secondary-bg: #c01c28;
  --funnel-button-secondary-text: #ffffff;
  --funnel-table-row-alt-bg: #f6c1c1;
  --funnel-table-row-selected-bg: #f6f5f4;
  --funnel-input-bg: var(--funnel-surface);
  --selection-card-area-max-height: min(30dvh, 14.5rem);
}
"""


def extract_selection_rules(css: str) -> list[str]:
    rules: list[str] = []
    idx = 0
    while True:
        i = css.find(".selection-", idx)
        if i < 0:
            break
        j = css.find("{", i)
        if j < 0:
            break
        depth = 0
        k = j
        while k < len(css):
            if css[k] == "{":
                depth += 1
            elif css[k] == "}":
                depth -= 1
                if depth == 0:
                    rules.append(css[i : k + 1])
                    idx = k + 1
                    break
            k += 1
        else:
            break
    return rules


def main() -> None:
    css = SRC.read_text(encoding="utf-8")
    rules = extract_selection_rules(css)
    unique: list[str] = []
    seen: set[str] = set()
    for r in rules:
        if r not in seen and "react-flow" not in r and "nodesselection" not in r:
            seen.add(r)
            unique.append(r)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "/* Auto-extracted Strela funnel styles from reference */\n"
        + ROOT_VARS
        + "\n"
        + "\n".join(unique)
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(unique)} rules to {OUT}")


if __name__ == "__main__":
    main()
