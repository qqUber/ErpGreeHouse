"""Financial calculation utilities with configurable currency subunits.

This module provides functions for converting between monetary amounts and subunits
(e.g., cents, kopecks) with proper decimal precision to avoid floating-point errors.
The subunit factor is configurable via CURRENCY_SUBUNIT_FACTOR env variable.
"""

import os
from decimal import ROUND_HALF_UP, Decimal


def _get_subunit_factor() -> int:
    """Get currency subunit factor from environment."""
    return int(os.getenv("CURRENCY_SUBUNIT_FACTOR", "100"))


def to_subunits(amount: float | str | Decimal) -> int:
    """Convert monetary amount to subunits (cents/kopecks) with proper rounding.

    Uses CURRENCY_SUBUNIT_FACTOR from environment (default: 100).

    Args:
        amount: The monetary amount as float, string, or Decimal

    Returns:
        The amount in subunits as an integer

    Examples:
        >>> to_subunits(9.99)  # factor=100
        999
        >>> to_subunits(9.99)  # factor=1 (no subunits)
        10
    """
    factor = _get_subunit_factor()
    if isinstance(amount, Decimal):
        d = amount
    else:
        d = Decimal(str(amount))
    return int((d * factor).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def from_subunits(subunits: int) -> Decimal:
    """Convert subunits back to Decimal.

    Uses CURRENCY_SUBUNIT_FACTOR from environment (default: 100).

    Args:
        subunits: The amount in subunits

    Returns:
        The monetary amount as a Decimal
    """
    factor = _get_subunit_factor()
    return Decimal(subunits) / factor


def main_to_subunits(main_amount: int) -> int:
    """Convert main currency unit to subunits (e.g., rubles to kopecks).

    Args:
        main_amount: Amount in main currency unit (e.g., rubles, dollars)

    Returns:
        Amount in subunits
    """
    return main_amount * _get_subunit_factor()


def subunits_to_main(subunits: int) -> int:
    """Convert subunits to main currency unit (e.g., kopecks to rubles).

    Args:
        subunits: Amount in subunits

    Returns:
        Amount in main currency unit
    """
    return subunits // _get_subunit_factor()


# Keep old function names for backward compatibility
def to_cents(amount: float | str | Decimal) -> int:
    """Legacy alias for to_subunits()."""
    return to_subunits(amount)


def from_cents(cents: int) -> Decimal:
    """Legacy alias for from_subunits()."""
    return from_subunits(cents)


def convert_price_to_cents(price_raw: float | str | None) -> int:
    """Convert price to subunits for database storage.

    Handles various input formats:
    - float: 99.99 -> 9999 (factor=100)
    - int: 100 -> 10000 (factor=100)
    - str: "99.99" -> 9999, "100" -> 10000
    - str with comma: "99,99" -> 9999

    Args:
        price_raw: The price in various formats

    Returns:
        The price in subunits

    Raises:
        ValueError: If the price cannot be parsed
    """
    if price_raw is None or price_raw == "":
        return 0

    if isinstance(price_raw, (int, float)):
        return to_subunits(price_raw)

    # String handling
    price_str = str(price_raw).replace(",", ".").replace(" ", "").strip()
    if not price_str:
        return 0

    try:
        return to_subunits(price_str)
    except Exception as e:
        raise ValueError(f"Invalid price value: {price_raw}") from e
