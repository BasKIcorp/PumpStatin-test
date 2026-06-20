from __future__ import annotations

from typing import Any

from app.algorithms.bps_w_v2.models import SelectionInputV2


async def generate_bom(
    inp: SelectionInputV2, db: Any, options: dict[str, Any], rules: dict[str, Any]
) -> list[dict[str, Any]]:
    """ТЗ 2.4 — комплектация из BOM rules."""
    rows = await db.get_bom_rules(inp.station_type, inp.series, options)
    items: list[dict[str, Any]] = []
    for rule in rows:
        for item in rule.get("items", []):
            items.append({**item, "qty": inp.n1})
    if not items:
        bom_yaml = rules.get("bom", {}).get("default_items", [])
        for item in bom_yaml:
            items.append({**item, "qty": inp.n1})
    if options.get("filter") == "yes":
        items.append({"id": "filter", "label": "Фильтр", "qty": inp.n})
    return items
