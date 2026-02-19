from typing import Iterable

from fastapi import HTTPException

from .admin_auth_api import require_admin_token_or_env


def require_admin(x_admin_secret: str | None) -> dict:
    try:
        return require_admin_token_or_env(x_admin_secret)
    except HTTPException as e:
        raise e


def require_roles(x_admin_secret: str | None, *, roles: Iterable[str]) -> dict:
    admin = require_admin(x_admin_secret)
    role = str(admin.get("role") or "")
    if role not in set(roles):
        raise HTTPException(status_code=403, detail="Forbidden")
    return admin


def require_integration_secret(provided: str | None, expected: str) -> None:
    if not expected:
        raise HTTPException(status_code=500, detail="Integration secret not configured")
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid integration secret")
