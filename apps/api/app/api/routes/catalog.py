from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps_profile import get_profile_bundle, resolve_plugins

router = APIRouter()


@router.get("/{source:path}")
async def get_catalog(
    source: str,
    bundle: Annotated[dict, Depends(get_profile_bundle)],
):
    """Справочники для select-полей визарда (catalog.pumpTypes и т.д.)."""
    _, db, _, _, _ = resolve_plugins(bundle)
    items = await db.get_catalog(source)
    return {"source": source, "items": items}
