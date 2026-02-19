import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app import rate_limit


def _make_request(*, headers: dict[str, str] | None = None, client: tuple[str, int] | None = ("127.0.0.1", 1234)) -> Request:
    raw_headers: list[tuple[bytes, bytes]] = []
    for k, v in (headers or {}).items():
        raw_headers.append((k.lower().encode(), v.encode()))

    scope: dict[str, object] = {"type": "http", "method": "GET", "path": "/", "headers": raw_headers}
    if client is not None:
        scope["client"] = client
    return Request(scope)


def test_client_ip_x_forwarded_for_first() -> None:
    request = _make_request(headers={"x-forwarded-for": "203.0.113.9, 10.0.0.1"})
    assert rate_limit._client_ip(request) == "203.0.113.9"


def test_client_ip_falls_back_to_client_host() -> None:
    request = _make_request(headers={})
    assert rate_limit._client_ip(request) == "127.0.0.1"


def test_client_ip_unknown_when_no_client() -> None:
    request = _make_request(headers={}, client=None)
    assert rate_limit._client_ip(request) == "unknown"


def test_require_rate_limit_allows_under_limit_and_sets_expire_first_hit(mocker) -> None:
    mocker.patch("app.rate_limit.time.time", return_value=123.0)
    r = mocker.Mock()
    r.incr.return_value = 1
    mocker.patch("app.rate_limit.get_redis", return_value=r)

    request = _make_request(headers={"x-forwarded-for": "203.0.113.9"})
    rate_limit.require_rate_limit(request, scope="s", limit=10, window_sec=60)

    r.incr.assert_called_once_with("rl:s:ip:203.0.113.9:2")
    r.expire.assert_called_once_with("rl:s:ip:203.0.113.9:2", 60)


def test_require_rate_limit_raises_429_over_limit(mocker) -> None:
    mocker.patch("app.rate_limit.time.time", return_value=123.0)
    r = mocker.Mock()
    r.incr.return_value = 11
    mocker.patch("app.rate_limit.get_redis", return_value=r)

    request = _make_request(headers={"x-forwarded-for": "203.0.113.9"})
    with pytest.raises(HTTPException) as exc:
        rate_limit.require_rate_limit(request, scope="s", limit=10, window_sec=60)

    assert exc.value.status_code == 429


def test_require_rate_limit_swallow_redis_errors(mocker) -> None:
    mocker.patch("app.rate_limit.get_redis", side_effect=RuntimeError("down"))
    request = _make_request()
    rate_limit.require_rate_limit(request, scope="s", limit=1, window_sec=60)


def test_require_bruteforce_guard_raises_when_locked(mocker) -> None:
    r = mocker.Mock()
    r.get.return_value = "1"
    mocker.patch("app.rate_limit.get_redis", return_value=r)

    request = _make_request(headers={"x-forwarded-for": "203.0.113.9"})
    with pytest.raises(HTTPException) as exc:
        rate_limit.require_bruteforce_guard(request, username="  Admin@Example.COM  ", max_attempts=5, window_sec=60, lock_sec=300)

    assert exc.value.status_code == 429
    r.get.assert_called_once_with("bf:lock:admin@example.com:203.0.113.9")


def test_require_bruteforce_guard_swallow_redis_errors(mocker) -> None:
    mocker.patch("app.rate_limit.get_redis", side_effect=RuntimeError("down"))
    request = _make_request()
    rate_limit.require_bruteforce_guard(request, username="u", max_attempts=5, window_sec=60, lock_sec=300)


def test_register_bruteforce_failure_sets_lock_on_threshold(mocker) -> None:
    r = mocker.Mock()
    r.incr.return_value = 5
    mocker.patch("app.rate_limit.get_redis", return_value=r)

    request = _make_request(headers={"x-forwarded-for": "203.0.113.9"})
    rate_limit.register_bruteforce_failure(request, username="u", max_attempts=5, window_sec=60, lock_sec=300)

    r.set.assert_called_once_with("bf:lock:u:203.0.113.9", "1", ex=300)


def test_register_bruteforce_failure_swallow_redis_errors(mocker) -> None:
    mocker.patch("app.rate_limit.get_redis", side_effect=RuntimeError("down"))
    request = _make_request()
    rate_limit.register_bruteforce_failure(request, username="u", max_attempts=5, window_sec=60, lock_sec=300)
