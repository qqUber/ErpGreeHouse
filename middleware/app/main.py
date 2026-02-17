from fastapi import FastAPI, Request, Header, HTTPException
from starlette.status import HTTP_200_OK, HTTP_401_UNAUTHORIZED

from .config import get_settings
from .worker import process_telegram_update
from .bot import create_bot
from .worker import send_broadcast


app = FastAPI(title="Telegram CRM Middleware")


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
