import os
from pathlib import Path
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.status import HTTP_200_OK, HTTP_401_UNAUTHORIZED
from starlette.responses import JSONResponse, RedirectResponse, FileResponse
from contextlib import asynccontextmanager
import logging
import logging.config

# Configure logging
logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "standard",
                "level": "INFO",
            },
        },
        "loggers": {
            "": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": True,
            },
            "middleware": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": True,
            },
        },
    }
)

logger = logging.getLogger(__name__)

# Environment variables are loaded from .env in project root by uvicorn

# Environment variables are loaded from .env in project root by uvicorn
# or set explicitly in shell before running

from .config import get_settings
from .db import init_db
from .middlewares import rate_limit_middleware
import mimetypes

# Fix MIME types for Windows
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
from .admin_api import router as admin_router, public_router as public_router
from .admin_auth_api import public_router as auth_public_router, router as auth_router
from .admin_auth_api import _bootstrap_default_admin, _bootstrap_demo_users
from .integrations_api import (
    router as integrations_router,
    public_router as integrations_public_router,
)
from .integration_settings_api import router as integration_settings_router
from .products_api import router as products_router
from .marketing_api import router as marketing_router
from .tma_api import router as tma_router
from .test_api import router as test_router
from .analytics_api import router as analytics_router
from .dashboard_api import router as dashboard_router
from .debug_api import router as debug_router
from .integrations.webhooks import router as erp_webhook_router
from .erp_scheduler import start_erp_sync_scheduler
from .request_context import reset_admin_session_token, set_admin_session_token
from .runtime import is_debug
from .dev_seed import ensure_seed_data, should_auto_seed
from .worker import process_telegram_update
from .integrations.bots.telegram_handler import create_bot
from .integrations.bots.vk_handler import (
    create_vk_bot,
    validate_vk_token,
    process_vk_webhook_event,
    set_vk_config,
)
from .worker import send_broadcast

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    settings = get_settings()
    init_db()
    _bootstrap_default_admin()
    _bootstrap_demo_users()
    if should_auto_seed(settings):
        seeded = ensure_seed_data()
        logger.info("[SEED] Auto-seed completed: %s", seeded)

    # Load VK config from database if available
    _load_vk_config()

    yield
    # Shutdown (if needed)


app = FastAPI(title="Telegram CRM Middleware", lifespan=lifespan)

# Define public paths that should bypass authentication
PUBLIC_PATHS = frozenset(
    [
        "/",  # Root
        "/favicon.ico",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/health",
    ]
)

# Prefixes for public API endpoints
PUBLIC_PREFIXES = (
    "/api/v1/public/",
    "/api/v1/test/",
    "/telegram/",
    "/vk/",
    "/admin/broadcast",
    "/webhooks/",
)


def _is_public_path(path: str) -> bool:
    """Check if the path is public and should bypass authentication."""
    # Check exact matches
    if path in PUBLIC_PATHS:
        return True

    # Check exact admin path (static files)
    if path == "/admin" or path.startswith("/admin/"):
        return True

    # Check public API prefixes
    for prefix in PUBLIC_PREFIXES:
        if path.startswith(prefix):
            return True

    return False


@app.middleware("http")
async def _auth_protection(request: Request, call_next):
    """Middleware to protect routes and handle authentication properly."""
    from fastapi import HTTPException
    from .auth import validate_access_token
    from .request_context import get_admin_session_token

    try:
        # Get the path
        path = request.url.path
        method = request.method

        # Skip auth for public paths
        if _is_public_path(path):
            logger.info(f"[AUTH] Skipping auth for public path: {path}")
            return await call_next(request)

        # Skip auth for GET / (root) - redirect to /admin/
        if method == "GET" and path == "/":
            logger.info(f"[AUTH] Root path request, allowing: {path}")
            return await call_next(request)

        # Get token from cookies or headers
        access_token = request.cookies.get("access_token")
        if not access_token:
            auth_header = request.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                access_token = auth_header[7:]
        if not access_token:
            access_token = request.headers.get("x-admin-secret")
        if not access_token:
            access_token = get_admin_session_token()

        # Try JWT first, then fall back to legacy token
        payload = None
        if access_token:
            # Check if it's a JWT token (has 2 dots)
            if access_token.count(".") == 2:
                payload = validate_access_token(access_token)
            else:
                # Legacy token - will be validated by the endpoint
                pass

        # If we have a valid JWT payload, add user info to request state
        if payload:
            request.state.user = {
                "is_authenticated": True,
                "user_id": int(payload.get("sub", 0)),
                "username": payload.get("username", ""),
                "role": payload.get("role", ""),
                "permissions": payload.get("permissions", []),
            }
        else:
            # No valid token - let the endpoint handle auth (will return 401)
            logger.info(f"[AUTH] No valid token for protected route: {path}")

        # Continue processing the request
        response = await call_next(request)
        return response

    except HTTPException as e:
        # Return proper HTTP exceptions as JSON
        return JSONResponse(status_code=e.status_code, content={"detail": e.detail})
    except Exception as e:
        # Log the error and return 500 instead of letting it propagate
        import traceback
        logger.error(f"[AUTH] Middleware error: {type(e).__name__}: {e}")
        logger.error(f"[AUTH] Traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error in auth middleware"},
        )



@app.middleware("http")
async def _security_headers(request: Request, call_next):
    resp = await call_next(request)
    if not resp.headers.get("content-security-policy"):
        connect_src = os.getenv("CSP_CONNECT_SRC", "'self'").strip() or "'self'"
        script_src = "'self'"
        style_src = "'self' 'unsafe-inline'"
        img_src = "'self' data:"
        font_src = "'self' data:"
        frame_ancestors = "'none'"
        default_src = "'self'"
        path = request.url.path

        # FastAPI Swagger/ReDoc pages load CDN assets and inline bootstrap scripts.
        # Keep strict CSP by default, but allow required sources for docs routes.
        if path.startswith("/docs") or path.startswith("/redoc"):
            script_src = "'self' 'unsafe-inline' https://cdn.jsdelivr.net"
            style_src = "'self' 'unsafe-inline' https://cdn.jsdelivr.net"
            img_src = "'self' data: https://fastapi.tiangolo.com"
        csp = (
            f"default-src {default_src}; "
            f"base-uri 'self'; "
            f"form-action 'self'; "
            f"frame-ancestors {frame_ancestors}; "
            f"object-src 'none'; "
            f"script-src {script_src}; "
            f"style-src {style_src}; "
            f"img-src {img_src}; "
            f"font-src {font_src}; "
            f"connect-src {connect_src}"
        )
        resp.headers["Content-Security-Policy"] = csp
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), "
        "accelerometer=(), gyroscope=(), magnetometer=(), "
        "display-capture=(), screen-wake-lock=()",
    )
    resp.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    resp.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
    return resp


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception):
    if is_debug():
        return JSONResponse(status_code=500, content={"detail": str(exc)})
    return JSONResponse(
        status_code=500, content={"detail": "Внутренняя ошибка. Попробуйте позже."}
    )


@app.exception_handler(HTTPException)
async def _http_exception_handler(request: Request, exc: HTTPException):
    if is_debug():
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    status = int(exc.status_code)
    if status in (401, 403):
        msg = "Доступ запрещён."
    elif status == 404:
        msg = "Не найдено."
    elif status == 429:
        msg = "Слишком много попыток. Попробуйте позже."
    elif status >= 500:
        msg = "Внутренняя ошибка. Попробуйте позже."
    else:
        msg = "Ошибка запроса."
    return JSONResponse(status_code=status, content={"detail": msg})


origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
if origins_str.strip() == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in origins_str.split(",") if o.strip()]

# If using wildcard, we can't use credentials
allow_credentials = "*" not in origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip сжатие для ответов больше 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Rate limiting middleware for auth endpoints
app.add_middleware(rate_limit_middleware)  # type: ignore[arg-type]

app.include_router(admin_router)
app.include_router(public_router)
app.include_router(auth_public_router)
app.include_router(auth_router)
app.include_router(integrations_router)
app.include_router(integrations_public_router)
app.include_router(integration_settings_router)
app.include_router(products_router)
app.include_router(marketing_router)
app.include_router(tma_router)
app.include_router(analytics_router)
app.include_router(dashboard_router)
app.include_router(debug_router)
app.include_router(erp_webhook_router)
if os.getenv("E2E_TEST_MODE", "false").lower() in ("1", "true", "yes"):
    app.include_router(test_router)

admin_dist_override = os.getenv("ADMIN_UI_DIST", "").strip()
admin_dist = (
    Path(admin_dist_override)
    if admin_dist_override
    else (Path(__file__).resolve().parents[2] / "admin-ui" / "dist")
)


@app.get("/", status_code=307, include_in_schema=False)
async def _root() -> RedirectResponse:
    if admin_dist.exists():
        return RedirectResponse(url="/admin/")
    return RedirectResponse(url="/docs")


def verify_webhook_secret(
    secret_header: str | None, expected: str, admin_secret: str = ""
) -> None:
    """Verify the webhook secret header against expected secret or ADMIN_SECRET.

    Allows authentication via either:
    1. WEBHOOK_SECRET (dedicated webhook secret)
    2. ADMIN_SECRET (environment admin secret)

    In development mode (when both secrets are empty), webhooks are allowed without auth.

    Args:
        secret_header: The secret provided in the request header
        expected: The expected WEBHOOK_SECRET value
        admin_secret: Optional ADMIN_SECRET value to also accept

    Raises:
        HTTPException: 401 if secret is invalid, None if allowed
    """
    # Development mode: allow webhooks without secret if no secrets configured
    if not expected and not admin_secret:
        logger.warning(
            "[WEBHOOK] No webhook secret configured - allowing webhook request (dev mode)"
        )
        return

    if not secret_header:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED, detail="Missing webhook secret"
        )

    # Use constant-time comparison to prevent timing attacks
    from secrets import compare_digest

    # Accept either webhook_secret or ADMIN_SECRET
    expected_match = compare_digest(secret_header, expected) if expected else False
    admin_match = compare_digest(secret_header, admin_secret) if admin_secret else False

    if not (expected_match or admin_match):
        logger.warning("[WEBHOOK] Invalid webhook secret attempt")
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret"
        )


@app.get("/health", status_code=HTTP_200_OK)
async def health() -> dict:
    return {"status": "ok"}


@app.post("/telegram/webhook", status_code=HTTP_200_OK)
async def telegram_webhook(
    request: Request,
    x_webhook_secret: str | None = Header(default=None, convert_underscores=False),
) -> dict:
    settings = get_settings()
    admin_secret = os.getenv("ADMIN_SECRET", "")
    verify_webhook_secret(x_webhook_secret, settings.webhook_secret, admin_secret)
    payload = await request.json()
    process_telegram_update.delay(payload)
    return {"accepted": True}


@app.post("/telegram/set_webhook", status_code=HTTP_200_OK)
async def set_webhook(
    x_webhook_secret: str | None = Header(default=None, convert_underscores=False),
) -> dict:
    settings = get_settings()
    admin_secret = os.getenv("ADMIN_SECRET", "")
    verify_webhook_secret(x_webhook_secret, settings.webhook_secret, admin_secret)
    bot = create_bot()
    url = f"{settings.base_web_url}/telegram/webhook"
    await bot.set_webhook(url)
    return {"webhook_set": True, "url": url}


@app.post("/vk/webhook", status_code=HTTP_200_OK)
async def vk_webhook(
    request: Request,
    x_webhook_secret: str | None = Header(default=None, convert_underscores=False),
) -> dict:
    """Handle VK Callback API webhooks"""
    settings = get_settings()
    admin_secret = os.getenv("ADMIN_SECRET", "")
    verify_webhook_secret(x_webhook_secret, settings.webhook_secret, admin_secret)

    payload = await request.json()

    # Handle confirmation (VK requires this for initial setup)
    if payload.get("type") == "confirmation":
        confirmation_code = os.getenv("VK_GROUP_CONFIRMATION_CODE", "")
        if not confirmation_code:
            logger.error("VK_GROUP_CONFIRMATION_CODE is not set in environment")
            return {"response": "error"}
        return {"response": confirmation_code}

    # Process the event
    event_type = payload.get("type")

    if event_type == "message_new":
        # Process new message event
        await process_vk_webhook_event(payload)
    elif event_type == "message_event":
        # Process keyboard button click events
        await process_vk_webhook_event(payload)
    else:
        logger.info(f"Unhandled VK event type: {event_type}")

    # VK Callback API expects "ok" response
    return {"response": "ok"}


@app.post("/admin/broadcast", status_code=HTTP_200_OK)
async def admin_broadcast(
    request: Request,
    x_webhook_secret: str | None = Header(default=None, convert_underscores=False),
) -> dict:
    settings = get_settings()
    admin_secret = os.getenv("ADMIN_SECRET", "")
    verify_webhook_secret(x_webhook_secret, settings.webhook_secret, admin_secret)
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    send_broadcast.delay(text)
    return {"queued": True}


# Mount Admin UI at the end to avoid shadowing explicit routes
if admin_dist.exists():
    # Explicit route for /admin/ to ensure trailing slash is handled correctly
    @app.get("/admin/", include_in_schema=False)
    async def serve_admin_index(request: Request):
        return FileResponse(str(admin_dist / "index.html"))

    @app.get("/admin/{rest_of_path:path}", include_in_schema=False)
    async def serve_admin_ui(request: Request, rest_of_path: str = ""):
        # Normalize path
        if not rest_of_path:
            return FileResponse(str(admin_dist / "index.html"))

        file_path = admin_dist / rest_of_path
        if file_path.is_file():
            return FileResponse(str(file_path))

        # SPA fallback: if it's not a file but looks like a route (no extension)
        # or if it's just /admin/something
        if "." not in rest_of_path:
            return FileResponse(str(admin_dist / "index.html"))

        # Otherwise it's a missing asset
        raise HTTPException(status_code=404, detail="Asset not found")

    # Important: mount is NOT used here because the catch-all route above handles it
    # including the SPA fallback.
else:
    print(f"WARNING: Admin UI distribution not found at {admin_dist}")


def _load_vk_config() -> None:
    """Load VK config from database at startup."""
    try:
        from .db import get_db
        from .integrations.bots.vk_handler import set_vk_config

        db = get_db()
        conn = db.connect()
        try:
            cur = conn.execute(
                "SELECT access_token, group_id, api_version FROM vk_settings WHERE enabled = 1 LIMIT 1"
            )
            row = cur.fetchone()
            if row and row["access_token"] and row["group_id"]:
                set_vk_config(
                    access_token=row["access_token"],
                    group_id=int(row["group_id"]),
                    api_version=row["api_version"] or "5.131",
                )
                logger.info(f"VK config loaded for group {row['group_id']}")
        finally:
            conn.close()
    except Exception as e:
        logger.warning(f"Failed to load VK config: {e}")


def _start_erp_scheduler() -> None:
    """Start ERP sync scheduler at startup."""
    try:
        scheduler = start_erp_sync_scheduler()
        if scheduler:
            logger.info("ERP sync scheduler started")
        else:
            logger.info("ERP sync scheduler not started (disabled or error)")
    except Exception as e:
        logger.warning(f"Failed to start ERP sync scheduler: {e}")


# Catch-all for SPA routing (Vue Router history mode)
# Returns index.html for any non-API path
@app.get("/{path:path}", include_in_schema=False)
async def catch_all_spa(path: str):
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    if (admin_dist / "index.html").is_file():
        return FileResponse(str(admin_dist / "index.html"))
    raise HTTPException(status_code=404, detail="Not found")
