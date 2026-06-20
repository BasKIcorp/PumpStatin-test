"""Маппинг legacy camelCase и контекста визарда → SelectionInputV2."""

from typing import Any

from app.algorithms.bps_w_v2.models import SelectionInputV2

_CARD_STATION_MAP = {
    "bps-w-pro": ("BPS-W", "Pro"),
    "bps-w-lite": ("BPS-W", "Lite"),
    "bps-c-pro": ("BPS-C", "Pro"),
    "bps-c-lite": ("BPS-C", "Lite"),
}


def map_parameters(raw: dict[str, Any], *, mf: str | None = None) -> SelectionInputV2:
    station_type = raw.get("station_type")
    series = raw.get("series")
    pu_line = raw.get("puLine") or raw.get("pu_line")
    hm_line = raw.get("hmLine") or raw.get("hm_line")
    card_key = pu_line or hm_line
    if card_key and card_key in _CARD_STATION_MAP:
        station_type, series = _CARD_STATION_MAP[card_key]
    if not station_type and raw.get("productClass") == "hydromodules":
        station_type = "BPS-C"
    if not station_type:
        station_type = "BPS-W"
    if not series:
        series = "Pro"

    med = str(raw.get("med") or raw.get("fluidType") or "вода")
    if med in ("water", "glycol"):
        med = "вода" if med == "water" else "гликоль"

    pump_type = str(raw.get("pump_type") or raw.get("pumpType") or "COMOS")
    pump_type_map = {"civos": "CIVOS", "inline": "COMOS", "end": "HMIP"}
    pump_type = pump_type_map.get(pump_type.lower(), pump_type).upper()

    data = {
        "station_type": station_type,
        "series": series,
        "Q": float(raw.get("Q") or raw.get("flowRate") or 15),
        "H": float(raw.get("H") or raw.get("head") or 20),
        "Hst": float(raw.get("Hst") or raw.get("staticHead") or 0),
        "Hgr": float(raw.get("Hgr") or raw.get("guaranteedHead") or 0),
        "n1": int(raw.get("n1") or raw.get("workingPumps") or 1),
        "n2": int(raw.get("n2") or raw.get("reservePumps") or 1),
        "med": med,
        "c": int(raw.get("c") or (100 if med == "вода" else 30)),
        "t": int(raw.get("t") or raw.get("temperature") or 20),
        "pump_type": pump_type,
        "mf": mf or raw.get("mf"),
        "include_piping_losses": bool(raw.get("include_piping_losses", False)),
    }
    if data["station_type"] == "BPS-C":
        data["Hgr"] = 0
    return SelectionInputV2(**data)
