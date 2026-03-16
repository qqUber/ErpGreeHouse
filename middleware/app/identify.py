import re
import secrets

_phone_re = re.compile(r"[^0-9+]")


def normalize_phone(raw: str) -> str:
    if not raw:
        return ""
    s = raw.strip()
    s = _phone_re.sub("", s)
    if not s:
        return ""
    if s.startswith("00"):
        s = "+" + s[2:]
    if s.startswith("8") and len(s) == 11:
        s = "+7" + s[1:]
    if not s.startswith("+"):
        if len(s) == 10:
            s = "+7" + s
        else:
            s = "+" + s
    if not re.fullmatch(r"\+[1-9]\d{7,14}", s):
        return ""
    return s


def normalize_name(raw: str) -> str:
    if not raw:
        return ""
    s = re.sub(r"\s+", " ", raw.strip())
    s = re.sub(r"[^\w\s\-']", "", s, flags=re.UNICODE)
    return s.strip()


def generate_qr_token() -> str:
    """Generate cryptographically secure QR token"""
    return secrets.token_hex(4).upper()
