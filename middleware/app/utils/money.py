"""Financial calculation utilities with Decimal precision.

This module provides functions for converting between monetary amounts and cents
with proper decimal precision to avoid floating-point errors.
"""

from decimal import ROUND_HALF_UP, Decimal


def to_cents(amount: float | str | Decimal) -> int:
    """Convert monetary amount to cents with proper rounding.

    Args:
        amount: The monetary amount as float, string, or Decimal

    Returns:
        The amount in cents as an integer

    Examples:
        >>> to_cents(9.99)
        999
        >>> to_cents("0.005")
        1
        >>> to_cents(Decimal("0.015"))
        2
    """
    if isinstance(amount, Decimal):
        d = amount
    else:
        d = Decimal(str(amount))
    return int((d * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def from_cents(cents: int) -> Decimal:
    """Convert cents back to Decimal.

    Args:
        cents: The amount in cents

    Returns:
        The monetary amount as a Decimal

    Examples:
        >>> from_cents(999)
        Decimal('9.99')
    """
    return Decimal(cents) / 100


def convert_price_to_cents(price_raw: float | str | None) -> int:
    """Convert price to cents for database storage.

    Handles various input formats:
    - float: 99.99 -> 9999
    - int: 100 -> 10000
    - str: "99.99" -> 9999, "100" -> 10000
    - str with comma: "99,99" -> 9999

    Args:
        price_raw: The price in various formats

    Returns:
        The price in cents

    Raises:
        ValueError: If the price cannot be parsed
    """
    if price_raw is None or price_raw == "":
        return 0

    if isinstance(price_raw, (int, float)):
        return to_cents(price_raw)

    # String handling
    price_str = str(price_raw).replace(",", ".").replace(" ", "").strip()
    if not price_str:
        return 0

    try:
        return to_cents(price_str)
    except Exception as e:
        raise ValueError(f"Invalid price value: {price_raw}") from e
