"""Admin API: site config, preview, blocks registry, file upload."""

import shutil
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import require_admin
from app.core.profile_loader import load_profile_bundle
from app.services import config_store

router = APIRouter()


# --- Site config ---


@router.get("/profiles/{profile_id}/site")
def admin_get_site(profile_id: str, _: Annotated[dict, Depends(require_admin)]):
    """Загрузить site.yaml профиля (дефолт, если файла нет)."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")
    return config_store.load_site_yaml(profile_id)


@router.put("/profiles/{profile_id}/site")
def admin_update_site(
    profile_id: str,
    body: dict[str, Any],
    _: Annotated[dict, Depends(require_admin)],
):
    """Сохранить site.yaml профиля."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")
    config_store.save_site_yaml(profile_id, body)
    return config_store.load_site_yaml(profile_id)


# --- Preview (full bundle) ---


@router.get("/profiles/{profile_id}/preview")
def admin_profile_preview(profile_id: str, _: Annotated[dict, Depends(require_admin)]):
    """Полный бандл профиля: profile + branding + wizard + site."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")
    try:
        bundle = load_profile_bundle(profile_id)
    except FileNotFoundError:
        raise HTTPException(404, "Profile data not found") from None
    bundle["site"] = config_store.load_site_yaml(profile_id)
    return bundle


# --- Blocks registry ---


@router.get("/blocks/registry")
def admin_blocks_registry(_: Annotated[dict, Depends(require_admin)]):
    """Зарегистрированные типы блоков для построения страниц."""
    return {
        "blocks": [
            {"type": "hero", "label": "Hero / Заголовок"},
            {"type": "rich-text", "label": "Rich Text / Текст"},
            {"type": "card-grid", "label": "Card Grid / Сетка карточек"},
            {"type": "wizard", "label": "Wizard / Форма подбора"},
        ]
    }


# --- File upload ---


@router.post("/upload")
async def admin_upload(
    profile_id: str,
    file: Annotated[UploadFile, File(...)],
    _: Annotated[dict, Depends(require_admin)],
):
    """Загрузить файл (например логотип) в config/profiles/{id}/assets/."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    assets_dir = config_store.PROFILES_DIR / profile_id / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)

    dest = assets_dir / file.filename

    # Предотвращение path traversal
    try:
        dest = dest.resolve()
        assets_dir = assets_dir.resolve()
        if not str(dest).startswith(str(assets_dir)):
            raise HTTPException(400, "Invalid file path")
    except (ValueError, OSError):
        raise HTTPException(400, "Invalid file path") from None

    content = await file.read()
    dest.write_bytes(content)

    return {
        "filename": file.filename,
        "path": str(dest.relative_to(config_store.PROFILES_DIR.parent)),
        "size": len(content),
    }
