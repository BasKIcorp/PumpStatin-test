"""Admin API: site config, preview, blocks registry, file upload."""

import datetime
import shutil
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import require_admin
from app.core.profile_loader import load_profile_bundle
from app.services import config_store
from app.schemas.site import get_default_site

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
            {"type": "product-grid", "label": "Product Grid / Каталог"},
            {"type": "contact-form", "label": "Contact Form / Обратная связь"},
            {"type": "map", "label": "Map / Карта"},
            {"type": "gallery", "label": "Gallery / Галерея"},
            {"type": "accordion", "label": "Accordion / Аккордеон"},
            {"type": "tabs", "label": "Tabs / Табы"},
            {"type": "divider", "label": "Divider / Разделитель"},
            {"type": "image", "label": "Image / Изображение"},
            {"type": "video", "label": "Video / Видео"},
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


# --- Wizard config ---


@router.get("/profiles/{profile_id}/wizard")
def admin_get_wizard(
    profile_id: str,
    _: Annotated[dict, Depends(require_admin)],
):
    """Загрузить конфиг визарда (navigation.yaml + flows)."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")

    profile = config_store.load_profile_yaml(profile_id)
    nav_key = profile.get("wizard", {}).get("navigation", "wizard/navigation.yaml")
    nav_path = config_store.PROFILES_DIR / profile_id / nav_key

    if not nav_path.is_file():
        return {"navigation": {"steps": [], "cards": {}}, "flows": {}}

    nav = config_store.load_yaml(nav_path)

    # Load flows referenced in navigation
    flows_base = config_store.PROFILES_DIR / profile_id / "wizard" / "flows"
    flows: dict[str, Any] = {}
    if flows_base.is_dir():
        for f in flows_base.glob("*.yaml"):
            flow_data = config_store.load_yaml(f)
            flows[flow_data.get("id", f.stem)] = flow_data

    return {"navigation": nav, "flows": flows}


@router.put("/profiles/{profile_id}/wizard")
def admin_save_wizard(
    profile_id: str,
    body: dict[str, Any],
    _: Annotated[dict, Depends(require_admin)],
):
    """Сохранить конфиг визарда (navigation + flows)."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")

    profile = config_store.load_profile_yaml(profile_id)
    nav_key = profile.get("wizard", {}).get("navigation", "wizard/navigation.yaml")
    nav_path = config_store.PROFILES_DIR / profile_id / nav_key

    # Save navigation
    nav = body.get("navigation", {})
    nav_path.parent.mkdir(parents=True, exist_ok=True)
    config_store.save_yaml(nav_path, nav)

    # Save flows
    flows = body.get("flows", {})
    flows_dir = config_store.PROFILES_DIR / profile_id / "wizard" / "flows"
    flows_dir.mkdir(parents=True, exist_ok=True)
    for flow_id, flow_data in flows.items():
        if isinstance(flow_data, dict):
            flow_path = flows_dir / f"{flow_id}.yaml"
            with flow_path.open("w", encoding="utf-8") as f:
                import yaml
                yaml.dump(
                    flow_data,
                    f,
                    allow_unicode=True,
                    default_flow_style=False,
                    sort_keys=False,
                )

    return {"ok": True}


# --- PDF preview / compile ---


@router.post("/profiles/{profile_id}/pdf/preview")
def admin_pdf_preview(
    profile_id: str,
    body: dict[str, Any],
    _: Annotated[dict, Depends(require_admin)],
):
    """Сгенерировать PDF из template.json + тестовые данные."""
    from app.pdf.block_renderer import render_pdf_from_blocks
    from fastapi.responses import Response

    config_store.load_site_yaml(profile_id)
    selection = body.get("selection", {})
    branding = body.get("branding", {})

    tpl_path = config_store.PROFILES_DIR / profile_id / "pdf" / "template.json"
    if tpl_path.is_file():
        with tpl_path.open("r", encoding="utf-8") as f:
            import json
            template = json.load(f)
    else:
        template = {"blocks": body.get("blocks", [])}

    pdf_bytes = render_pdf_from_blocks(template, selection, branding)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{profile_id}-preview.pdf"',
        },
    )


# --- Versioning (git snapshots) ---

import subprocess  # noqa: E402


def _git(*args: str, cwd: str | None = None) -> str:
    """Выполнить git команду, вернуть stdout."""
    base = str(config_store.PROFILES_DIR.parent.parent)  # project root
    try:
        result = subprocess.run(
            ["git", *args],
            capture_output=True,
            text=True,
            cwd=cwd or base,
            timeout=10,
        )
        return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
        raise HTTPException(500, f"Git error: {e}")


@router.post("/profiles/{profile_id}/snapshot")
def admin_create_snapshot(
    profile_id: str,
    body: dict[str, Any],
    _: Annotated[dict, Depends(require_admin)],
):
    """Создать git snapshot (commit) профиля."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")

    msg = body.get("message", f"Snapshot: {profile_id}")

    # Stage and commit only the profile dir
    _git("add", f"config/profiles/{profile_id}")
    _git("commit", "-m", msg, "--allow-empty")

    return {"ok": True, "message": msg}


@router.get("/profiles/{profile_id}/versions")
def admin_list_versions(
    profile_id: str,
    _: Annotated[dict, Depends(require_admin)],
):
    """Получить историю коммитов, затрагивающих профиль."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")

    log = _git(
        "log",
        "--oneline",
        "--format=%H|%ct|%s",
        "-n",
        "20",
        "--",
        f"config/profiles/{profile_id}",
    )
    versions = []
    for line in log.split("\n"):
        if not line.strip():
            continue
        parts = line.split("|", 2)
        if len(parts) == 3:
            from datetime import datetime
            versions.append({
                "hash": parts[0][:8],
                "timestamp": datetime.fromtimestamp(int(parts[1])).isoformat(),
                "message": parts[2],
            })
    return {"versions": versions}


@router.post("/profiles/{profile_id}/rollback/{commit_hash}")
def admin_rollback(
    profile_id: str,
    commit_hash: str,
    _: Annotated[dict, Depends(require_admin)],
):
    """Откатить файлы профиля к указанному коммиту."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")

    _git("checkout", commit_hash, "--", f"config/profiles/{profile_id}")
    return {"ok": True, "hash": commit_hash}


@router.post("/profiles/{profile_id}/publish")
def admin_publish(
    profile_id: str,
    _: Annotated[dict, Depends(require_admin)],
):
    """Опубликовать: git add → commit → push."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")

    _git("add", f"config/profiles/{profile_id}")
    msg = f"Publish: {profile_id} - {datetime.datetime.now().isoformat()}"
    _git("commit", "-m", msg, "--allow-empty")
    try:
        push_result = _git("push", "origin", "base")
    except HTTPException:
        return {"ok": False, "error": "Push failed"}
    return {"ok": True, "message": msg, "push": push_result}


@router.get("/profiles/{profile_id}/status")
def admin_status(
    profile_id: str,
    _: Annotated[dict, Depends(require_admin)],
):
    """Статус профиля: есть ли незакоммиченные изменения."""
    dirty = _git("status", "--porcelain", f"config/profiles/{profile_id}")
    return {"dirty": len(dirty) > 0, "changes": dirty.split("\n") if dirty else []}


# --- PDF templates ---


@router.get("/profiles/{profile_id}/pdf/template")
def admin_get_pdf_template(
    profile_id: str,
    _: Annotated[dict, Depends(require_admin)],
):
    """Загрузить PDF template.json."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")
    tpl_path = config_store.PROFILES_DIR / profile_id / "pdf" / "template.json"
    if not tpl_path.is_file():
        return {"templateName": "custom", "blocks": []}
    with tpl_path.open("r", encoding="utf-8") as f:
        import json
        return json.load(f)


@router.put("/profiles/{profile_id}/pdf/template")
def admin_save_pdf_template(
    profile_id: str,
    body: dict[str, Any],
    _: Annotated[dict, Depends(require_admin)],
):
    """Сохранить PDF template.json."""
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")
    pdf_dir = config_store.PROFILES_DIR / profile_id / "pdf"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    tpl_path = pdf_dir / "template.json"
    with tpl_path.open("w", encoding="utf-8") as f:
        import json
        json.dump(body, f, ensure_ascii=False, indent=2)
    return {"ok": True}
