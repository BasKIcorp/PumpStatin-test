"""Админ API: пользователи, профили/фронт, PDF, БД, плагины."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select

from app.api.deps import require_admin
from app.core.config import settings
from app.core.profile_loader import list_profiles
from app.db.models import CatalogItemModel, PumpModel
from app.db.session import SessionLocal
from app.services import config_store
from app.services.accounts import create_user, delete_user, list_users_admin, update_user

router = APIRouter()


# --- Users ---


class UserCreateBody(BaseModel):
    username: str
    password: str
    displayName: str
    profileId: str
    organization: str | None = None
    role: str = "user"


class UserUpdateBody(BaseModel):
    password: str | None = None
    displayName: str | None = None
    profileId: str | None = None
    organization: str | None = None
    role: str | None = None


@router.get("/meta")
def admin_meta(_: Annotated[dict, Depends(require_admin)]):
    return config_store.admin_meta()


@router.get("/users")
def admin_list_users(_: Annotated[dict, Depends(require_admin)]):
    return {"users": list_users_admin()}


@router.post("/users")
def admin_create_user(body: UserCreateBody, admin: Annotated[dict, Depends(require_admin)]):
    try:
        user = create_user(
            username=body.username,
            password=body.password,
            display_name=body.displayName,
            profile_id=body.profileId,
            organization=body.organization,
            role=body.role,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    return {"user": user}


@router.put("/users/{username}")
def admin_update_user(
    username: str,
    body: UserUpdateBody,
    admin: Annotated[dict, Depends(require_admin)],
):
    try:
        user = update_user(
            username,
            password=body.password,
            display_name=body.displayName,
            profile_id=body.profileId,
            organization=body.organization,
            role=body.role,
        )
    except ValueError as e:
        raise HTTPException(404, str(e)) from e
    return {"user": user}


@router.delete("/users/{username}")
def admin_delete_user(username: str, admin: Annotated[dict, Depends(require_admin)]):
    if username == admin["username"]:
        raise HTTPException(400, "Cannot delete yourself")
    try:
        delete_user(username)
    except ValueError as e:
        raise HTTPException(404, str(e)) from e
    return {"ok": True}


# --- Profiles / frontend / plugins ---


class ProfilePluginsBody(BaseModel):
    displayName: str | None = None
    theme: str | None = None
    algorithm: str | None = None
    database: str | None = None
    pdfTemplate: str | None = None
    layoutVariant: str | None = None
    active: bool | None = None


class BrandingBody(BaseModel):
    branding: dict[str, Any]


@router.get("/profiles")
def admin_profiles(_: Annotated[dict, Depends(require_admin)]):
    registry = config_store.load_registry().get("profiles", [])
    items = []
    for entry in registry:
        pid = entry["id"]
        try:
            profile = config_store.load_profile_yaml(pid)
        except FileNotFoundError:
            profile = {}
        items.append(
            {
                "registry": entry,
                "profile": {
                    "id": profile.get("id", pid),
                    "displayName": profile.get("displayName", entry.get("displayName")),
                    "theme": profile.get("theme"),
                    "algorithm": profile.get("algorithm"),
                    "database": profile.get("database"),
                    "pdfTemplate": profile.get("pdfTemplate"),
                    "active": profile.get("active", True),
                },
            }
        )
    return {"profiles": items}


@router.get("/profiles/{profile_id}")
def admin_profile_detail(profile_id: str, _: Annotated[dict, Depends(require_admin)]):
    try:
        profile = config_store.load_profile_yaml(profile_id)
        branding = config_store.load_branding_yaml(profile_id)
    except FileNotFoundError:
        raise HTTPException(404, "Profile not found") from None
    return {
        "registry": config_store.get_registry_entry(profile_id),
        "profile": profile,
        "branding": branding,
    }


@router.put("/profiles/{profile_id}/plugins")
def admin_update_profile_plugins(
    profile_id: str,
    body: ProfilePluginsBody,
    _: Annotated[dict, Depends(require_admin)],
):
    try:
        profile = config_store.load_profile_yaml(profile_id)
    except FileNotFoundError:
        raise HTTPException(404, "Profile not found") from None

    patch = body.model_dump(exclude_none=True)
    for key in ("displayName", "theme", "algorithm", "database", "pdfTemplate", "active"):
        if key in patch:
            profile[key] = patch[key]

    try:
        config_store.save_profile_yaml(profile_id, profile)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e

    registry_patch: dict[str, Any] = {}
    if body.displayName is not None:
        registry_patch["displayName"] = body.displayName
    if body.theme is not None:
        registry_patch["theme"] = body.theme
    if body.pdfTemplate is not None:
        registry_patch["pdfTemplate"] = body.pdfTemplate
    if body.layoutVariant is not None:
        registry_patch["layoutVariant"] = body.layoutVariant
    if registry_patch:
        config_store.upsert_registry_entry(profile_id, registry_patch)

    if body.layoutVariant is not None:
        try:
            branding = config_store.load_branding_yaml(profile_id)
            branding["layoutVariant"] = body.layoutVariant
            config_store.save_branding_yaml(profile_id, branding)
        except FileNotFoundError:
            pass

    try:
        profile = config_store.load_profile_yaml(profile_id)
        branding = config_store.load_branding_yaml(profile_id)
    except FileNotFoundError:
        raise HTTPException(404, "Profile not found") from None
    return {
        "registry": config_store.get_registry_entry(profile_id),
        "profile": profile,
        "branding": branding,
    }


@router.put("/profiles/{profile_id}/branding")
def admin_update_branding(
    profile_id: str,
    body: BrandingBody,
    _: Annotated[dict, Depends(require_admin)],
):
    if profile_id not in config_store.list_profile_ids():
        raise HTTPException(404, "Profile not found")
    config_store.save_branding_yaml(profile_id, body.branding)
    return {"branding": body.branding}


# --- Database ---


def _require_postgres_admin():
    if settings.use_mock_db:
        raise HTTPException(
            503,
            "Редактирование БД недоступно при USE_MOCK_DB=true. "
            "Установите USE_MOCK_DB=false и перезапустите API.",
        )


class PumpBody(BaseModel):
    id: str
    product_line: str
    name: str
    nominal_flow: float
    nominal_head: float
    power_kw: float | None = None


class CatalogItemBody(BaseModel):
    source_key: str
    value: str
    label: str


@router.get("/database/status")
async def admin_db_status(_: Annotated[dict, Depends(require_admin)]):
    if settings.use_mock_db:
        return {"mode": "mock", "editable": False}
    async with SessionLocal() as session:
        pumps = await session.execute(select(PumpModel.id))
        catalog = await session.execute(select(CatalogItemModel.id))
        return {
            "mode": "postgres",
            "editable": True,
            "pumpCount": len(pumps.scalars().all()),
            "catalogItemCount": len(catalog.scalars().all()),
        }


@router.get("/database/pumps")
async def admin_list_pumps(_: Annotated[dict, Depends(require_admin)]):
    _require_postgres_admin()
    async with SessionLocal() as session:
        result = await session.execute(select(PumpModel))
        rows = result.scalars().all()
        return {
            "pumps": [
                {
                    "id": r.id,
                    "product_line": r.product_line,
                    "name": r.name,
                    "nominal_flow": r.nominal_flow,
                    "nominal_head": r.nominal_head,
                    "power_kw": r.power_kw,
                }
                for r in rows
            ]
        }


@router.post("/database/pumps")
async def admin_create_pump(body: PumpBody, _: Annotated[dict, Depends(require_admin)]):
    _require_postgres_admin()
    async with SessionLocal() as session:
        existing = await session.get(PumpModel, body.id)
        if existing:
            raise HTTPException(400, "Pump id already exists")
        session.add(
            PumpModel(
                id=body.id,
                product_line=body.product_line,
                name=body.name,
                nominal_flow=body.nominal_flow,
                nominal_head=body.nominal_head,
                power_kw=body.power_kw,
            )
        )
        await session.commit()
    return {"ok": True}


@router.put("/database/pumps/{pump_id}")
async def admin_update_pump(
    pump_id: str, body: PumpBody, _: Annotated[dict, Depends(require_admin)]
):
    _require_postgres_admin()
    async with SessionLocal() as session:
        row = await session.get(PumpModel, pump_id)
        if not row:
            raise HTTPException(404, "Pump not found")
        row.product_line = body.product_line
        row.name = body.name
        row.nominal_flow = body.nominal_flow
        row.nominal_head = body.nominal_head
        row.power_kw = body.power_kw
        await session.commit()
    return {"ok": True}


@router.delete("/database/pumps/{pump_id}")
async def admin_delete_pump(pump_id: str, _: Annotated[dict, Depends(require_admin)]):
    _require_postgres_admin()
    async with SessionLocal() as session:
        await session.execute(delete(PumpModel).where(PumpModel.id == pump_id))
        await session.commit()
    return {"ok": True}


@router.get("/database/catalog")
async def admin_list_catalog(
    source_key: str | None = None,
    _: Annotated[dict, Depends(require_admin)] = None,
):
    _require_postgres_admin()
    async with SessionLocal() as session:
        q = select(CatalogItemModel)
        if source_key:
            q = q.where(CatalogItemModel.source_key == source_key)
        result = await session.execute(q)
        return {
            "items": [
                {
                    "id": r.id,
                    "source_key": r.source_key,
                    "value": r.value,
                    "label": r.label,
                }
                for r in result.scalars().all()
            ]
        }


@router.post("/database/catalog")
async def admin_create_catalog_item(
    body: CatalogItemBody, _: Annotated[dict, Depends(require_admin)]
):
    _require_postgres_admin()
    async with SessionLocal() as session:
        session.add(
            CatalogItemModel(
                source_key=body.source_key,
                value=body.value,
                label=body.label,
            )
        )
        await session.commit()
    return {"ok": True}


@router.delete("/database/catalog/{item_id}")
async def admin_delete_catalog_item(
    item_id: int, _: Annotated[dict, Depends(require_admin)]
):
    _require_postgres_admin()
    async with SessionLocal() as session:
        await session.execute(
            delete(CatalogItemModel).where(CatalogItemModel.id == item_id)
        )
        await session.commit()
    return {"ok": True}


@router.get("/profiles-list")
def admin_profiles_simple(_: Annotated[dict, Depends(require_admin)]):
    """Справочник profileId для форм пользователей."""
    return {"profiles": list_profiles()}
