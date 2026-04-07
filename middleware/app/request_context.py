from __future__ import annotations

import contextvars

_admin_session_token: contextvars.ContextVar[str | None] = contextvars.ContextVar("admin_session_token", default=None)


def set_admin_session_token(token: str | None) -> contextvars.Token[str | None]:
    return _admin_session_token.set(token)


def reset_admin_session_token(tok: contextvars.Token[str | None]) -> None:
    _admin_session_token.reset(tok)


def get_admin_session_token() -> str | None:
    return _admin_session_token.get()
