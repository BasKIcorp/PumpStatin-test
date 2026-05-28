from pathlib import Path
from typing import Any

import yaml

from app.core.config import PROFILES_DIR, settings

# theme → допустимые PDF (должны совпадать с config/profiles/_registry.yaml)
THEME_PDF_PAIRS: dict[str, str] = {
    "theme-strela": "strela-standard",
    "theme-acme": "acme-datasheet",
    "theme-nord": "nord-compact",
    "theme-aqua": "aqua-report",
}


def _load_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def validate_profile_plugins(profile: dict[str, Any]) -> None:
    theme = profile.get("theme", "")
    pdf = profile.get("pdfTemplate", "")
    expected_pdf = THEME_PDF_PAIRS.get(theme)
    if expected_pdf and pdf != expected_pdf:
        raise ValueError(
            f"Profile {profile.get('id')}: pdfTemplate '{pdf}' "
            f"не соответствует теме '{theme}' (ожидается '{expected_pdf}')"
        )


def load_profile_bundle(profile_id: str | None = None) -> dict[str, Any]:
    pid = profile_id or settings.app_profile_id
    base = PROFILES_DIR / pid
    if not base.is_dir():
        raise FileNotFoundError(f"Profile not found: {pid}")

    profile = _load_yaml(base / "profile.yaml")
    validate_profile_plugins(profile)
    branding = _load_yaml(base / "branding.yaml")
    navigation = _load_yaml(base / profile["wizard"]["navigation"])

    flows: dict[str, Any] = {}
    flows_dir = base / "wizard" / "flows"
    if flows_dir.is_dir():
        for flow_file in flows_dir.glob("*.yaml"):
            flow = _load_yaml(flow_file)
            flows[flow.get("id", flow_file.stem)] = flow

    return {
        "profile": profile,
        "branding": branding,
        "wizard": {"navigation": navigation, "flows": flows},
    }


def list_profiles() -> list[dict[str, Any]]:
    registry_path = PROFILES_DIR / "_registry.yaml"
    if registry_path.exists():
        data = _load_yaml(registry_path)
        return data.get("profiles", [])
    return [
        {"id": d.name, "displayName": d.name}
        for d in PROFILES_DIR.iterdir()
        if d.is_dir() and not d.name.startswith("_")
    ]
