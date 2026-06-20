from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token
from app.services.accounts import get_user, is_admin

security = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict | None:
    if creds is None:
        return None
    try:
        payload = decode_token(creds.credentials)
    except ValueError:
        # Просроченный/битый токен — как без авторизации (не блокируем публичные эндпоинты)
        return None
    username = payload.get("sub")
    if not username:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = get_user(username)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def require_user(
    user: Annotated[dict | None, Depends(get_current_user)],
) -> dict:
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return user


async def require_admin(
    user: Annotated[dict, Depends(require_user)],
) -> dict:
    if not is_admin(user["username"]):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
