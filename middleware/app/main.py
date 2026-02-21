import os
from pathlib import Path
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.status import HTTP_200_OK, HTTP_401_UNAUTHORIZED
from starlette.responses import JSONResponse, RedirectResponse, FileResponse

# Environment variables are loaded from .env in project root by uvicorn
# or set explicitly in shell before running

from .config import get_settings
from .db import init_db
import mimetypes

# Fix MIME types for Windows
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
from .admin_api import router as admin_router, public_router as public_router
from .admin_auth_api import public_router as auth_public_router, router as auth_router
from .admin_auth_api import _bootstrap_default_admin, _bootstrap_demo_users
from .integrations_api import router as integrations_router, public_router as integrations_public_router
from .products_api import router as products_router
from .marketing_api import router as marketing_router
from .tma_api import router as tma_router
from .test_api import router as test_router
from .request_context import reset_admin_session_token, set_admin_session_token
from .runtime import is_debug
from .worker import process_telegram_update
from .bot import create_bot
from .worker import send_broadcast


app = FastAPI(title="Telegram CRM Middleware")


@app.middleware("http")
async def _admin_session_context(request: Request, call_next):
    tok = set_admin_session_token(request.cookies.get("admin_session"))
    try:
        return await call_next(request)
    finally:
        reset_admin_session_token(tok)


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
    return JSONResponse(status_code=500, content={"detail": "Внутренняя ошибка. Попробуйте позже."})


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

origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174")
origins = [o.strip() for o in origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip сжатие для ответов больше 1KB
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(admin_router)
app.include_router(public_router)
app.include_router(auth_public_router)
app.include_router(auth_router)
app.include_router(integrations_router)
app.include_router(integrations_public_router)
app.include_router(products_router)
app.include_router(marketing_router)
app.include_router(tma_router)
if os.getenv("E2E_TEST_MODE", "false").lower() in ("1", "true", "yes"):
    app.include_router(test_router)

admin_dist_override = os.getenv("ADMIN_UI_DIST", "").strip()
admin_dist = Path(admin_dist_override) if admin_dist_override else (Path(__file__).resolve().parents[2] / "admin-ui" / "dist")

@app.get("/", status_code=307, include_in_schema=False)
async def _root() -> RedirectResponse:
    if admin_dist.exists():
        return RedirectResponse(url="/admin/")
    return RedirectResponse(url="/docs")


@app.on_event("startup")
async def _startup() -> None:
    get_settings()
    init_db()
    _bootstrap_default_admin()
    _bootstrap_demo_users()


def verify_webhook_secret(secret_header: str | None, expected: str) -> None:
    if not secret_header or secret_header != expected:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")


@app.get("/health", status_code=HTTP_200_OK)
async def health() -> dict:
    return {"status": "ok"}


@app.post("/telegram/webhook", status_code=HTTP_200_OK)
async def telegram_webhook(
    request: Request,
    x_webhook_secret: str | None = Header(default=None, convert_underscores=False),
) -> dict:
    settings = get_settings()
    verify_webhook_secret(x_webhook_secret, settings.webhook_secret)
    payload = await request.json()
    process_telegram_update.delay(payload)
    return {"accepted": True}


@app.post("/telegram/set_webhook", status_code=HTTP_200_OK)
async def set_webhook(
    x_webhook_secret: str | None = Header(default=None, convert_underscores=False),
) -> dict:
    settings = get_settings()
    verify_webhook_secret(x_webhook_secret, settings.webhook_secret)
    bot = create_bot()
    url = f"{settings.base_web_url}/telegram/webhook"
    await bot.set_webhook(url)
    return {"webhook_set": True, "url": url}


@app.post("/admin/broadcast", status_code=HTTP_200_OK)
async def admin_broadcast(
    request: Request,
    x_webhook_secret: str | None = Header(default=None, convert_underscores=False),
) -> dict:
    settings = get_settings()
    verify_webhook_secret(x_webhook_secret, settings.webhook_secret)
    body = await request.json()
    text = body.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    send_broadcast.delay(text)
    return {"queued": True}


# Mount Admin UI at the end to avoid shadowing explicit routes
if admin_dist.exists():
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



