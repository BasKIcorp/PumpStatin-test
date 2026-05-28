from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user, require_user
from app.core.profile_loader import load_profile_bundle
from app.core.security import create_access_token
from app.services.accounts import authenticate, list_demo_accounts

router = APIRouter()


class LoginBody(BaseModel):
    username: str
    password: str


@router.get("/demo-accounts")
def demo_accounts():
    """Список демо-логинов для экрана входа (без паролей)."""
    return {"accounts": list_demo_accounts()}


@router.post("/login")
def login(body: LoginBody):
    user = authenticate(body.username, body.password)
    if not user:
        raise HTTPException(401, "Неверный логин или пароль")
    token = create_access_token(
        user["username"],
        extra={"profileId": user["profileId"]},
    )
    bundle = load_profile_bundle(user["profileId"])
    return {
        "accessToken": token,
        "user": user,
        "profile": bundle["profile"],
        "branding": bundle["branding"],
        "role": user.get("role", "user"),
    }


@router.get("/me")
def me(user: Annotated[dict, Depends(require_user)]):
    bundle = load_profile_bundle(user["profileId"])
    return {
        "user": user,
        "role": user.get("role", "user"),
        "profile": bundle["profile"],
        "branding": bundle["branding"],
        "wizard": bundle["wizard"],
    }


@router.get("/session")
def session(user: Annotated[dict | None, Depends(get_current_user)]):
    """Профиль для фронта: авторизованный пользователь или гостевой APP_PROFILE_ID."""
    from app.core.config import settings

    profile_id = user["profileId"] if user else settings.app_profile_id
    bundle = load_profile_bundle(profile_id)
    return {
        "authenticated": user is not None,
        "user": user,
        **bundle,
    }
