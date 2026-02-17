import os
from fastapi import HTTPException


def require_admin(x_admin_secret: str | None) -> None:
    expected = os.getenv("ADMIN_SECRET", "")
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_SECRET not configured")
    if not x_admin_secret or x_admin_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid admin secret")


def require_integration_secret(provided: str | None, expected: str) -> None:
    if not expected:
        raise HTTPException(status_code=500, detail="Integration secret not configured")
    if not provided or provided != expected:
        raise HTTPException(status_code=401, detail="Invalid integration secret")
