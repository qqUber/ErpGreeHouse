import asyncio
import os
import statistics
import time
from dataclasses import dataclass

import httpx


@dataclass
class Result:
    ok: int
    err: int
    lat_ms: list[float]


def _percentile(data: list[float], p: float) -> float:
    if not data:
        return 0.0
    s = sorted(data)
    k = (len(s) - 1) * p
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return s[f]
    return s[f] + (s[c] - s[f]) * (k - f)


async def _one(
    client: httpx.AsyncClient, url: str, headers: dict[str, str]
) -> tuple[bool, float]:
    t0 = time.perf_counter()
    try:
        r = await client.get(url, headers=headers)
        ok = r.status_code < 500
        return ok, (time.perf_counter() - t0) * 1000.0
    except Exception:
        return False, (time.perf_counter() - t0) * 1000.0


async def run(url: str, headers: dict[str, str], users: int, seconds: int) -> Result:
    timeout = httpx.Timeout(connect=2.0, read=5.0, write=2.0, pool=2.0)
    limits = httpx.Limits(max_keepalive_connections=users, max_connections=users)
    ok = 0
    err = 0
    lat: list[float] = []

    async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
        end = time.time() + seconds
        sem = asyncio.Semaphore(users)

        async def worker() -> None:
            nonlocal ok, err
            while time.time() < end:
                async with sem:
                    success, ms = await _one(client, url, headers)
                    lat.append(ms)
                    if success:
                        ok += 1
                    else:
                        err += 1

        tasks = [asyncio.create_task(worker()) for _ in range(users)]
        await asyncio.gather(*tasks)

    return Result(ok=ok, err=err, lat_ms=lat)


def main() -> None:
    base = os.getenv("LOAD_BASE_URL", "http://127.0.0.1:8000")
    endpoint = os.getenv("LOAD_ENDPOINT", "/api/v1/public/status")
    users = int(os.getenv("LOAD_USERS", "50"))
    seconds = int(os.getenv("LOAD_SECONDS", "10"))
    admin_secret = os.getenv("ADMIN_SECRET", "")

    url = base + endpoint
    headers: dict[str, str] = {}
    if endpoint.startswith("/api/") and not endpoint.startswith("/api/v1/public"):
        if admin_secret:
            headers["x-admin-secret"] = admin_secret

    res = asyncio.run(run(url, headers, users=users, seconds=seconds))
    total = res.ok + res.err
    rps = total / seconds if seconds > 0 else 0.0

    p50 = _percentile(res.lat_ms, 0.50)
    p95 = _percentile(res.lat_ms, 0.95)
    p99 = _percentile(res.lat_ms, 0.99)
    avg = statistics.mean(res.lat_ms) if res.lat_ms else 0.0

    print(f"url={url}")
    print(f"users={users} seconds={seconds}")
    print(f"total={total} ok={res.ok} err={res.err} rps={rps:.1f}")
    print(f"lat_ms avg={avg:.1f} p50={p50:.1f} p95={p95:.1f} p99={p99:.1f}")


if __name__ == "__main__":
    main()
