"""
QR Code Utilities

Unified QR code generation for tokens and images.
Two simple functions for all QR operations.
"""

import io
import random
import sqlite3
import threading
from collections import deque

import qrcode
from aiogram.types import BufferedInputFile
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

from ..config import get_settings

_RECENT_TOKEN_CACHE_SIZE = 50_000
_recent_tokens = deque()
_recent_tokens_set = set()
_recent_tokens_lock = threading.Lock()


def _reserve_recent_token(token: str) -> bool:
    """Reserve token in process-local cache to reduce burst duplicates."""
    with _recent_tokens_lock:
        if token in _recent_tokens_set:
            return False
        _recent_tokens.append(token)
        _recent_tokens_set.add(token)
        if len(_recent_tokens) > _RECENT_TOKEN_CACHE_SIZE:
            expired = _recent_tokens.popleft()
            _recent_tokens_set.discard(expired)
        return True


def generate_unique_token(conn: sqlite3.Connection, max_attempts: int = 100) -> str:
    """
    Generate unique 8-digit numeric QR token for customers.

    Format: 12345678 (no leading zeros for better scannability)
    Range: 10,000,000 to 99,999,999
    Ensures database uniqueness.
    """
    for attempt in range(max_attempts):
        # Generate 8-digit number (10,000,000 to 99,999,999)
        qr_code_int = random.randint(10_000_000, 99_999_999)
        qr_code = str(qr_code_int)

        # Verify uniqueness in database
        try:
            existing = conn.execute("SELECT id FROM customers WHERE qr_token=?", (qr_code,)).fetchone()
            if not existing and _reserve_recent_token(qr_code):
                return qr_code
        except sqlite3.OperationalError as e:
            if "no such table" in str(e):
                # Table doesn't exist, token is unique by default
                if _reserve_recent_token(qr_code):
                    return qr_code
            else:
                raise

    # If we get here, something is wrong
    raise ValueError(f"Failed to generate unique QR token after {max_attempts} attempts")


def make_qr_image(customer_id: int, qr_token: str) -> BufferedInputFile:
    """
    Generate professional QR code image with visual branding.

    Creates a branded QR code image with:
    - Main QR code with the token
    - Mosaic background with blurred QR codes
    - Environment watermark (DEV/TEST)
    - "Код — карта" label at top
    - Optimized PNG output
    """
    settings = get_settings()

    # Create main QR code with controlled parameters
    qr = qrcode.QRCode(
        version=1,
        box_size=20,
        border=2,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
    )
    qr.add_data(qr_token)
    qr.make(fit=True)
    main_qr = qr.make_image(fill_color="black", back_color="white").convert("RGB")

    # Create canvas with larger size
    canvas_size = main_qr.size[0] * 5 // 4  # 125% of QR size
    canvas = Image.new("RGB", (canvas_size, canvas_size), "black")

    # Add mosaic background with blurred QR codes
    for _ in range(40):
        payload = str(random.randint(1000, 9999))
        bg_qr = qrcode.make(payload).resize((80, 80)).convert("RGB")
        bg_qr = ImageEnhance.Brightness(bg_qr).enhance(0.2)  # Darken background
        x = random.randint(0, canvas_size - 80)
        y = random.randint(0, canvas_size - 80)
        canvas.paste(bg_qr, (x, y))

    # Add fog/mist overlay for aesthetic depth
    mist = Image.new("RGBA", canvas.size, (255, 255, 255, 30))  # Semi-transparent white
    canvas = Image.alpha_composite(canvas.convert("RGBA"), mist)

    # Add main QR code in center (80% of canvas)
    main_size = int(canvas_size * 0.8)
    main_qr_resized = main_qr.resize((main_size, main_size))
    offset = ((canvas_size - main_size) // 2, (canvas_size - main_size) // 2)
    canvas.paste(main_qr_resized, offset)

    # Add environment-specific watermark
    try:
        draw = ImageDraw.Draw(canvas)
        if settings.environment == "development":
            # Add "DEV" watermark in corner
            draw.text((10, 10), "DEV", fill=(255, 255, 255, 128))
        elif settings.environment == "testing":
            # Add "TEST" watermark
            draw.text((10, 10), "TEST", fill=(255, 255, 255, 128))
    except Exception:
        pass  # Ignore font errors

    # Add label at top
    try:
        label = "Код — карта"
        font_size = canvas_size // 25  # Relative font size
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()

        # Calculate text position (centered at top)
        bbox = draw.textbbox((0, 0), label, font=font)
        text_width = bbox[2] - bbox[0]
        text_x = (canvas_size - text_width) // 2
        text_y = canvas_size // 20  # 5% from top

        draw.text((text_x, text_y), label, fill="white", font=font)
    except Exception:
        pass  # Ignore font errors

    # Convert back to RGB and save
    final_image = canvas.convert("RGB")
    buffer = io.BytesIO()
    final_image.save(buffer, format="PNG", optimize=True)
    return BufferedInputFile(buffer.getvalue(), filename=f"customer-card-{customer_id}.png")
