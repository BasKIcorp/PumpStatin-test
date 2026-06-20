from typing import Annotated

from fastapi import APIRouter, Depends

from app.algorithms.bps_w_v2.rules_loader import load_algorithm_rules
from app.api.deps import get_current_user
from app.core.config import PROFILES_DIR, settings
from app.core.profile_loader import list_profiles, load_profile_bundle
from app.services.config_store import load_site_yaml

router = APIRouter()


@router.get("/profile")
def get_profile(user: Annotated[dict | None, Depends(get_current_user)]):
    """Конфиг профиля: приоритет у аккаунта, иначе APP_PROFILE_ID."""
    profile_id = user["profileId"] if user else settings.app_profile_id
    return load_profile_bundle(profile_id)


@router.get("/profiles")
def get_profiles_registry():
    return {"profiles": list_profiles()}


@router.get("/site")
def get_site_config(user: Annotated[dict | None, Depends(get_current_user)]):
    """Конфиг сайта (site.yaml): страницы, layout, навигация."""
    profile_id = user["profileId"] if user else settings.app_profile_id
    return load_site_yaml(profile_id)


@router.get("/block-registry")
def get_block_registry(user: Annotated[dict | None, Depends(get_current_user)]):
    """Реестр типов блоков и пресетов из YAML профиля."""
    import yaml

    profile_id = user["profileId"] if user else settings.app_profile_id
    path = PROFILES_DIR / profile_id / "blocks" / "registry.yaml"
    if not path.exists():
        return {"profileId": profile_id, "blocks": [], "fieldTypes": [], "layoutVariants": []}
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return {"profileId": profile_id, **data}


@router.get("/algorithm-rules")
def get_algorithm_rules(user: Annotated[dict | None, Depends(get_current_user)]):
    """Правила алгоритма подбора для активного профиля (YAML merge)."""
    profile_id = user["profileId"] if user else settings.app_profile_id
    from app.core.config import PROFILES_DIR

    rules = load_algorithm_rules(PROFILES_DIR / profile_id)
    return {"profileId": profile_id, "rules": rules}
