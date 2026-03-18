from app.identify import normalize_name, normalize_phone


def test_normalize_phone_ru_8_prefix() -> None:
    assert normalize_phone("89991234567") == "+79991234567"


def test_normalize_phone_ru_10_digits() -> None:
    assert normalize_phone("9991234567") == "+79991234567"


def test_normalize_phone_invalid() -> None:
    assert normalize_phone("") == ""
    assert normalize_phone("abc") == ""
    assert normalize_phone("+000") == ""


def test_normalize_name() -> None:
    result = normalize_name("  Иванов   Иван ")
    assert isinstance(result, dict)
    assert result.get("normalized") == "Иванов Иван"
    assert result.get("detected_gender") == "unknown"
    assert result.get("gender_warning") is None
    assert result.get("suggestions") is None
