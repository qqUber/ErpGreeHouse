import re

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


def normalize_name(raw: str, locale: str = "ru", check_gender: bool = True) -> dict:
    """
    Normalize name and optionally check for gender mismatches.

    Args:
        raw: Raw name string
        locale: Language locale ('ru', 'sr', 'en')
        check_gender: Whether to perform gender checking

    Returns:
        Dictionary with normalized name and gender warnings
    """
    if not raw:
        return {
            "normalized": "",
            "gender_warning": None,
            "suggestions": None,
            "detected_gender": "unknown",
        }

    # Basic normalization
    s = re.sub(r"\s+", " ", raw.strip())
    s = re.sub(r"[^\w\s\-']", "", s, flags=re.UNICODE)
    normalized = s.strip()

    # Gender checking
    gender_warning = None
    suggestions = None
    detected_gender = "unknown"

    if check_gender and normalized:
        try:
            from .utils.gender_correction import suggest_name_correction

            correction = suggest_name_correction(normalized, locale)

            gender_warning = correction.get("warning")
            suggestions = correction.get("suggested_name")
            detected_gender = correction.get("detected_gender")

        except ImportError:
            # Gender correction module not available
            pass
        except Exception:
            # Error in gender correction, continue without it
            pass

    return {
        "normalized": normalized,
        "gender_warning": gender_warning,
        "suggestions": suggestions,
        "detected_gender": detected_gender,
    }


# Legacy generate_qr_token() removed - use generate_unique_qr_token() from customer_identity
# For QR token generation, import: from .customer_identity import generate_unique_qr_token
