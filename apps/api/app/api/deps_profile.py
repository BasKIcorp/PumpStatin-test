from typing import Annotated, Any

from fastapi import Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.profile_loader import load_profile_bundle
from app.core.registry import get_algorithm, get_database, get_pdf_renderer


async def get_profile_bundle(
    user: Annotated[dict | None, Depends(get_current_user)],
) -> dict[str, Any]:
    profile_id = user["profileId"] if user else settings.app_profile_id
    return load_profile_bundle(profile_id)


def resolve_plugins(bundle: dict[str, Any]):
    p = bundle["profile"]
    db_name = p["database"]
    if settings.use_mock_db:
        db_name = "mock"
    return (
        get_algorithm(p["algorithm"]),
        get_database(db_name),
        get_pdf_renderer(p["pdfTemplate"]),
        bundle["branding"],
        p["id"],
    )
