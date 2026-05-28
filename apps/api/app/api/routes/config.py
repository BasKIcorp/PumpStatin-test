from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.profile_loader import list_profiles, load_profile_bundle

router = APIRouter()


@router.get("/profile")
def get_profile(user: Annotated[dict | None, Depends(get_current_user)]):
    """Конфиг профиля: приоритет у аккаунта, иначе APP_PROFILE_ID."""
    profile_id = user["profileId"] if user else settings.app_profile_id
    return load_profile_bundle(profile_id)


@router.get("/profiles")
def get_profiles_registry():
    return {"profiles": list_profiles()}
