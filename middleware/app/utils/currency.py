"""
Currency formatting utilities with multi-language support.
Uses babel.numbers for proper locale-aware formatting.
"""

import os
from dataclasses import dataclass
from typing import Optional

try:
    from babel.core import UnknownLocaleError
    from babel.numbers import format_currency as babel_format_currency

    BABEL_AVAILABLE = True
except ImportError:
    BABEL_AVAILABLE = False


@dataclass
class CurrencyConfig:
    """Currency configuration with locale support."""

    code: str = "RUB"
    symbol: str = "₽"
    symbol_position: str = "after"  # before|after
    decimal_places: int = 0
    locale: str = "ru_RU"


class CurrencyFormatter:
    """Centralized currency formatting with locale support."""

    def __init__(self, config: Optional[CurrencyConfig] = None):
        self.config = config or self._load_config()
        self._locale_cache = {}

    def _load_config(self) -> CurrencyConfig:
        """Load currency configuration from environment."""
        return CurrencyConfig(
            code=os.getenv("CURRENCY_CODE", "RUB"),
            symbol=os.getenv("CURRENCY_SYMBOL", "₽"),
            symbol_position=os.getenv("CURRENCY_SYMBOL_POSITION", "after"),
            decimal_places=int(os.getenv("CURRENCY_DECIMAL_PLACES", "0")),
            locale=os.getenv("LOCALE", "ru_RU"),
        )

    def format_currency(self, amount: float, locale: Optional[str] = None) -> str:
        """
        Format currency amount with proper locale-aware formatting.

        Args:
            amount: Amount to format
            locale: Override locale (e.g., 'en_US', 'sr_RS')

        Returns:
            Formatted currency string
        """
        target_locale = locale or self.config.locale

        # Use babel for proper formatting if available
        if BABEL_AVAILABLE:
            return self._format_with_babel(amount, target_locale)

        # Fallback to basic formatting
        return self._format_basic(amount, target_locale)

    def _format_with_babel(self, amount: float, locale: str) -> str:
        """Format using babel.numbers for proper locale support."""
        try:
            # Map currency codes to proper locales
            currency_locale = self._get_currency_locale(locale)

            # Get appropriate currency code for locale
            currency_code = self._get_currency_code_for_locale(locale)

            formatted = babel_format_currency(
                amount,
                currency_code,
                locale=currency_locale,
                format=self._get_currency_format(locale),
            )

            # Post-process for specific requirements
            formatted = self._post_process_format(formatted, locale)

            return formatted

        except (UnknownLocaleError, ValueError):
            # Fallback to basic formatting if locale not supported
            return self._format_basic(amount, locale)

    def _get_currency_code_for_locale(self, locale: str) -> str:
        """Get appropriate currency code for locale."""
        locale_currency_mapping = {
            "ru": "RUB",
            "ru_RU": "RUB",
            "en": "USD",
            "en_US": "USD",
            "sr": "RSD",
            "sr_RS": "RSD",
        }
        currency_code = locale_currency_mapping.get(locale, self.config.code)
        return currency_code

    def _format_basic(self, amount: float, locale: str) -> str:
        """Basic formatting fallback without babel."""
        try:
            # Set locale for number formatting
            if locale in self._locale_cache:
                locale.setlocale(locale.LC_ALL, self._locale_cache[locale])
            else:
                # Try to set locale, cache if successful
                try:
                    locale.setlocale(locale.LC_ALL, locale)
                    self._locale_cache[locale] = locale
                except locale.Error:
                    # Use default locale if specific one fails
                    locale.setlocale(locale.LC_ALL, "")

            # Format number with thousand separators
            if locale.startswith("en"):
                # English: 1,000.00
                formatted_number = f"{amount:,.{self.config.decimal_places}f}"
            elif locale.startswith("sr"):
                # Serbian: 1.000,00
                formatted_number = (
                    f"{amount:,.{self.config.decimal_places}f}".replace(",", "X")
                    .replace(".", ",")
                    .replace("X", ".")
                )
            else:
                # Russian/others: 1 000,00
                formatted_number = f"{amount:,.{self.config.decimal_places}f}".replace(
                    ",", " "
                ).replace(".", ",")

            # Add currency symbol
            if self.config.symbol_position == "before":
                return f"{self.config.symbol}{formatted_number}"
            else:
                return f"{formatted_number} {self.config.symbol}"

        except Exception:
            # Ultimate fallback
            if self.config.symbol_position == "before":
                return f"{self.config.symbol}{amount:.{self.config.decimal_places}f}"
            else:
                return f"{amount:.{self.config.decimal_places}f} {self.config.symbol}"

    def _get_currency_locale(self, locale: str) -> str:
        """Map user locale to proper currency locale."""
        locale_mapping = {
            "ru": "ru_RU",
            "ru_RU": "ru_RU",
            "en": "en_US",
            "en_US": "en_US",
            "sr": "sr_RS",
            "sr_RS": "sr_RS",
        }
        return locale_mapping.get(locale, "ru_RU")

    def _get_currency_format(self, locale: str) -> str:
        """Get currency format pattern for locale."""
        if locale.startswith("en"):
            return "¤#,##0.00"  # $1,000.00
        elif locale.startswith("sr"):
            return "#,##0.00 ¤"  # 1.000,00 RSD
        else:
            return "#,##0 ¤"  # 1 000 ₽ (no decimals for Russian)

    def _post_process_format(self, formatted: str, locale: str) -> str:
        """Post-process formatted string for specific requirements."""
        # Replace non-breaking spaces with regular spaces
        formatted = formatted.replace("\xa0", " ")

        # For Russian locale with 0 decimal places, remove decimal part
        if locale.startswith("ru") and self.config.decimal_places == 0:
            formatted = formatted.replace(",00", "")

        # For Serbian locale, ensure proper formatting
        if locale.startswith("sr"):
            # Convert comma to dot for decimal separator if needed
            if self.config.decimal_places > 0 and "," in formatted:
                formatted = formatted.replace(",", ".")

        return formatted

    def get_config(self) -> CurrencyConfig:
        """Get current currency configuration."""
        return self.config


# Global formatter instance
_currency_formatter = None


def get_currency_formatter() -> CurrencyFormatter:
    """Get global currency formatter instance."""
    global _currency_formatter
    if _currency_formatter is None:
        _currency_formatter = CurrencyFormatter()
    return _currency_formatter


def format_currency(amount: float, locale: Optional[str] = None) -> str:
    """
    Convenience function to format currency.

    Args:
        amount: Amount to format
        locale: Override locale

    Returns:
        Formatted currency string
    """
    return get_currency_formatter().format_currency(amount, locale)


def format_currency_with_options(amount: float, options: dict) -> str:
    """
    Convenience function to format currency with options.

    Args:
        amount: Amount to format
        options: Formatting options dict

    Returns:
        Formatted currency string
    """
    locale = options.get("locale")
    return get_currency_formatter().format_currency(amount, locale)
