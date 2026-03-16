import asyncio
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi import Request
from starlette.responses import Response

from app.middlewares import RateLimitMiddleware, _get_client_ip, _is_rate_limited_path


def _make_request(
    path: str,
    *,
    headers: dict[str, str] | None = None,
    client: tuple[str, int] | None = ("127.0.0.1", 1234),
) -> Request:
    raw_headers: list[tuple[bytes, bytes]] = []
    for key, value in (headers or {}).items():
        raw_headers.append((key.lower().encode(), value.encode()))

    scope: dict[str, object] = {
        "type": "http",
        "method": "GET",
        "path": path,
        "headers": raw_headers,
    }
    if client is not None:
        scope["client"] = client
    return Request(scope)


def test_get_client_ip_prefers_forwarded_for() -> None:
    request = _make_request(
        "/api/v1/public/auth/login",
        headers={"x-forwarded-for": "203.0.113.9, 10.0.0.1"},
    )

    assert _get_client_ip(request) == "203.0.113.9"


def test_get_client_ip_falls_back_to_real_ip() -> None:
    request = _make_request(
        "/api/v1/public/auth/login",
        headers={"x-real-ip": "203.0.113.10"},
    )

    assert _get_client_ip(request) == "203.0.113.10"


def test_is_rate_limited_path_uses_settings() -> None:
    settings = SimpleNamespace(
        rate_limited_paths=("/exact",),
        rate_limited_prefixes=("/prefix",),
    )

    assert _is_rate_limited_path("/exact", settings) is True
    assert _is_rate_limited_path("/prefix/login", settings) is True
    assert _is_rate_limited_path("/open", settings) is False


def test_rate_limit_middleware_returns_503_when_backend_unavailable() -> None:
    middleware = RateLimitMiddleware(app=Mock())
    request = _make_request("/api/v1/public/auth/login")
    settings = SimpleNamespace(
        rate_limited_paths=("/api/v1/public/auth/login",),
        rate_limited_prefixes=("/api/v1/public/auth",),
        rate_limit_requests=5,
        rate_limit_window_seconds=60,
    )

    async def call_next(_: Request) -> Response:
        return Response(status_code=200)

    with patch("app.middlewares.get_settings", return_value=settings), patch(
        "app.middlewares._check_sliding_window_rate_limit",
        return_value=(False, 0, 0, True),
    ):
        response = asyncio.run(middleware.dispatch(request, call_next))

    assert response.status_code == 503


def test_rate_limit_middleware_returns_429_when_limit_exceeded() -> None:
    middleware = RateLimitMiddleware(app=Mock())
    request = _make_request("/api/v1/public/auth/login")
    settings = SimpleNamespace(
        rate_limited_paths=("/api/v1/public/auth/login",),
        rate_limited_prefixes=("/api/v1/public/auth",),
        rate_limit_requests=5,
        rate_limit_window_seconds=60,
    )

    async def call_next(_: Request) -> Response:
        return Response(status_code=200)

    with patch("app.middlewares.get_settings", return_value=settings), patch(
        "app.middlewares._check_sliding_window_rate_limit",
        return_value=(False, 0, 5, False),
    ):
        response = asyncio.run(middleware.dispatch(request, call_next))

    assert response.status_code == 429
    assert response.headers["X-RateLimit-Limit"] == "5"
    assert response.headers["X-RateLimit-Remaining"] == "0"


def test_rate_limit_middleware_sets_headers_on_success() -> None:
    middleware = RateLimitMiddleware(app=Mock())
    request = _make_request("/api/v1/public/auth/login")
    settings = SimpleNamespace(
        rate_limited_paths=("/api/v1/public/auth/login",),
        rate_limited_prefixes=("/api/v1/public/auth",),
        rate_limit_requests=5,
        rate_limit_window_seconds=60,
    )

    async def call_next(_: Request) -> Response:
        return Response(status_code=200)

    with patch("app.middlewares.get_settings", return_value=settings), patch(
        "app.middlewares._check_sliding_window_rate_limit",
        return_value=(True, 3, 2, False),
    ):
        response = asyncio.run(middleware.dispatch(request, call_next))

    assert response.status_code == 200
    assert response.headers["X-RateLimit-Limit"] == "5"
    assert response.headers["X-RateLimit-Remaining"] == "3"
    assert "X-RateLimit-Reset" in response.headers
