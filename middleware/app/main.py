import os
from pathlib import Path
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.status import HTTP_200_OK, HTTP_401_UNAUTHORIZED

from .config import get_settings
from .db import init_db
from .admin_api import router as admin_router, public_router as public_router
from .admin_auth_api import public_router as auth_public_router, router as auth_router
from .admin_auth_api import _bootstrap_default_admin
from .integrations_api import router as integrations_router, public_router as integrations_public_router
from .worker import process_telegram_update
from .bot import create_bot
from .worker import send_broadcast


app = FastAPI(title="Telegram CRM Middleware")

origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174")
origins = [o.strip() for o in origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)
app.include_router(public_router)
app.include_router(auth_public_router)
app.include_router(auth_router)
app.include_router(integrations_router)
app.include_router(integrations_public_router)

admin_dist = Path(__file__).resolve().parents[2] / "admin-ui" / "dist"
if admin_dist.exists():
    app.mount("/", StaticFiles(directory=str(admin_dist), html=True), name="admin-ui")


@app.on_event("startup")
async def _startup() -> None:
    get_settings()
    init_db()
    _bootstrap_default_admin()


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
