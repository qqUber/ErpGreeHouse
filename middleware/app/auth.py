from fastapi import HTTPException

from .admin_auth_api import require_admin_token_or_env


def require_admin(x_admin_secret: str | None) -> None:
    try:
        require_admin_token_or_env(x_admin_secret)
    except HTTPException as e:
        raise e


def require_integration_secret(provided: str | None, expected: str) -> None:
    if not expected:
        raise HTTPException(status_code=500, detail="Integration secret not configured")
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid integration secret")
