"""Чтение/запись YAML-конфигов (профили, аккаунты, реестр)."""

from pathlib import Path
from typing import Any

import yaml

from app.core.config import ACCOUNTS_DIR, PROFILES_DIR
from app.core.profile_loader import THEME_PDF_PAIRS, validate_profile_plugins


def load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def save_yaml(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        yaml.dump(
            data,
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
        )


def list_profile_ids() -> list[str]:
    registry = load_yaml(PROFILES_DIR / "_registry.yaml")
    if registry.get("profiles"):
        return [p["id"] for p in registry["profiles"]]
    return [
        d.name
        for d in PROFILES_DIR.iterdir()
        if d.is_dir() and not d.name.startswith("_")
    ]


def load_registry() -> dict[str, Any]:
    return load_yaml(PROFILES_DIR / "_registry.yaml")


def save_registry(data: dict[str, Any]) -> None:
    save_yaml(PROFILES_DIR / "_registry.yaml", data)


def get_registry_entry(profile_id: str) -> dict[str, Any] | None:
    for entry in load_registry().get("profiles", []):
        if entry.get("id") == profile_id:
            return dict(entry)
    return None


def upsert_registry_entry(profile_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    data = load_registry()
    profiles: list[dict[str, Any]] = list(data.get("profiles", []))
    found = False
    for i, entry in enumerate(profiles):
        if entry.get("id") == profile_id:
            profiles[i] = {**entry, **patch, "id": profile_id}
            found = True
            break
    if not found:
        profiles.append({"id": profile_id, **patch})
    data["profiles"] = profiles
    save_registry(data)
    return get_registry_entry(profile_id) or {"id": profile_id, **patch}


def load_profile_yaml(profile_id: str) -> dict[str, Any]:
    path = PROFILES_DIR / profile_id / "profile.yaml"
    if not path.is_file():
        raise FileNotFoundError(profile_id)
    return load_yaml(path)


def save_profile_yaml(profile_id: str, data: dict[str, Any]) -> dict[str, Any]:
    data = {**data, "id": profile_id}
    validate_profile_plugins(data)
    save_yaml(PROFILES_DIR / profile_id / "profile.yaml", data)
    return data


def load_branding_yaml(profile_id: str) -> dict[str, Any]:
    path = PROFILES_DIR / profile_id / "branding.yaml"
    if not path.is_file():
        raise FileNotFoundError(profile_id)
    return load_yaml(path)


def save_branding_yaml(profile_id: str, data: dict[str, Any]) -> dict[str, Any]:
    save_yaml(PROFILES_DIR / profile_id / "branding.yaml", data)
    return data


def list_pdf_templates() -> list[dict[str, str]]:
    templates_dir = Path(__file__).resolve().parents[1] / "pdf" / "templates"
    items: list[dict[str, str]] = []
    if templates_dir.is_dir():
        for d in sorted(templates_dir.iterdir()):
            if d.is_dir():
                html = d / "template.html"
                items.append(
                    {
                        "id": d.name,
                        "path": str(html.relative_to(templates_dir.parent.parent.parent)),
                        "hasTemplate": html.is_file(),
                    }
                )
    return items


def admin_meta() -> dict[str, Any]:
    from app.core.config import settings
    from app.core.registry import list_algorithms, list_databases, list_pdf_templates as list_pdf_ids

    return {
        "algorithms": list_algorithms(),
        "databases": list_databases(),
        "pdfTemplates": list_pdf_ids(),
        "themes": sorted(THEME_PDF_PAIRS.keys()),
        "themePdfPairs": THEME_PDF_PAIRS,
        "layoutVariants": [
            "strela-funnel",
            "sidebar-brand",
            "topbar-dark",
            "minimal-light",
            "sidebar-gradient",
        ],
        "runtime": {
            "useMockDb": settings.use_mock_db,
            "appProfileId": settings.app_profile_id,
            "profilesDir": str(PROFILES_DIR),
            "accountsDir": str(ACCOUNTS_DIR),
        },
        "pdfTemplateFiles": list_pdf_templates(),
    }
