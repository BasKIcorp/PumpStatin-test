from pathlib import Path
from typing import Any

import yaml

from app.core.config import ACCOUNTS_DIR
from app.core.security import hash_password, verify_password

_users_cache: list[dict[str, Any]] | None = None


def invalidate_users_cache() -> None:
    global _users_cache
    _users_cache = None


def _load_users() -> list[dict[str, Any]]:
    global _users_cache
    if _users_cache is not None:
        return _users_cache
    path = ACCOUNTS_DIR / "users.yaml"
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    _users_cache = list(data.get("users", []))
    return _users_cache


def _save_users(users: list[dict[str, Any]]) -> None:
    path = ACCOUNTS_DIR / "users.yaml"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        yaml.dump(
            {"users": users},
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
        )
    invalidate_users_cache()


def _public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "username": user["username"],
        "displayName": user.get("displayName", user["username"]),
        "organization": user.get("organization", user.get("displayName", user["username"])),
        "profileId": user["profileId"],
        "role": user.get("role", "user"),
    }


def authenticate(username: str, password: str) -> dict[str, Any] | None:
    for user in _load_users():
        if user.get("username") != username:
            continue
        stored = user.get("password", "")
        if verify_password(password, stored):
            return _public_user(user)
    return None


def get_user(username: str) -> dict[str, Any] | None:
    for user in _load_users():
        if user.get("username") == username:
            return _public_user(user)
    return None


def get_user_role(username: str) -> str:
    for user in _load_users():
        if user.get("username") == username:
            return user.get("role", "user")
    return "user"


def is_admin(username: str) -> bool:
    return get_user_role(username) == "admin"


def list_users_admin() -> list[dict[str, Any]]:
    return [_public_user(u) for u in _load_users()]


def list_demo_accounts() -> list[dict[str, str]]:
    return [
        {
            "username": u["username"],
            "displayName": u.get("displayName", u["username"]),
            "organization": u.get("organization", u.get("displayName", u["username"])),
            "profileId": u["profileId"],
        }
        for u in _load_users()
        if u.get("role", "user") != "admin"
    ]


def create_user(
    *,
    username: str,
    password: str,
    display_name: str,
    profile_id: str,
    organization: str | None = None,
    role: str = "user",
) -> dict[str, Any]:
    users = _load_users()
    if any(u.get("username") == username for u in users):
        raise ValueError("User already exists")
    entry = {
        "username": username,
        "password": hash_password(password) if not password.startswith("$2") else password,
        "displayName": display_name,
        "profileId": profile_id,
        "role": role,
    }
    if organization:
        entry["organization"] = organization
    users.append(entry)
    _save_users(users)
    return _public_user(entry)


def update_user(
    username: str,
    *,
    password: str | None = None,
    display_name: str | None = None,
    profile_id: str | None = None,
    organization: str | None = None,
    role: str | None = None,
) -> dict[str, Any]:
    users = _load_users()
    for user in users:
        if user.get("username") != username:
            continue
        if display_name is not None:
            user["displayName"] = display_name
        if profile_id is not None:
            user["profileId"] = profile_id
        if organization is not None:
            user["organization"] = organization
        if role is not None:
            user["role"] = role
        if password:
            user["password"] = (
                hash_password(password) if not password.startswith("$2") else password
            )
        _save_users(users)
        return _public_user(user)
    raise ValueError("User not found")


def delete_user(username: str) -> None:
    users = _load_users()
    new_users = [u for u in users if u.get("username") != username]
    if len(new_users) == len(users):
        raise ValueError("User not found")
    _save_users(new_users)
