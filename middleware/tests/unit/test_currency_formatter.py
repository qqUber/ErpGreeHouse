"""
Unit tests for currency formatting functionality.
Tests the CurrencyFormatter class with different locales and configurations.
"""

import unittest
from unittest.mock import patch, MagicMock

from app.utils.currency import CurrencyFormatter, format_currency, CurrencyConfig


class TestCurrencyFormatter(unittest.TestCase):
    """Test cases for CurrencyFormatter class."""

    def setUp(self):
        """Set up test fixtures."""
        self.formatter = CurrencyFormatter()

    def test_default_config_loading(self):
        """Test that default configuration loads correctly."""
        config = self.formatter.get_config()
        
        self.assertEqual(config.code, "RUB")
        self.assertEqual(config.symbol, "₽")
        self.assertEqual(config.symbol_position, "after")
        self.assertEqual(config.decimal_places, 0)
        self.assertEqual(config.locale, "ru_RU")

    @patch.dict('os.environ', {
        'CURRENCY_CODE': 'USD',
        'CURRENCY_SYMBOL': '$',
        'CURRENCY_SYMBOL_POSITION': 'before',
        'CURRENCY_DECIMAL_PLACES': '2',
        'LOCALE': 'en_US'
    })
    def test_custom_config_loading(self):
        """Test that custom environment variables are loaded."""
        # Reset the global formatter to pick up new env vars
        from app.utils.currency import _currency_formatter
        _currency_formatter = None
        
        formatter = CurrencyFormatter()
        config = formatter.get_config()
        
        self.assertEqual(config.code, "USD")
        self.assertEqual(config.symbol, "$")
        self.assertEqual(config.symbol_position, "before")
        self.assertEqual(config.decimal_places, 2)
        self.assertEqual(config.locale, "en_US")

    def test_format_currency_russian(self):
        """Test currency formatting for Russian locale."""
        result = self.formatter.format_currency(1000, "ru_RU")
        
        # Should format as "1 000 ₽" (space as thousand separator, symbol after)
        self.assertIn("1 000", result)
        self.assertIn("₽", result)
        # Symbol should be after the number
        self.assertTrue(result.endswith(" ₽"))

    def test_format_currency_english(self):
        """Test currency formatting for English locale."""
        result = self.formatter.format_currency(1000, "en_US")
        
        # Should format as "$1,000.00" (symbol before, comma separator, 2 decimals)
        self.assertIn("$1,000.00", result)
        self.assertTrue(result.startswith("$"))

    def test_format_currency_serbian(self):
        """Test currency formatting for Serbian locale."""
        result = self.formatter.format_currency(1000, "sr_RS")
        
        # Should format as "1.000 RSD" (dot as thousand separator, symbol after)
        self.assertIn("1.000", result)
        self.assertIn("RSD", result)

    def test_format_currency_zero_amount(self):
        """Test formatting zero amount."""
        result = self.formatter.format_currency(0, "ru_RU")
        
        self.assertIn("0", result)
        self.assertIn("₽", result)

    def test_format_currency_decimal_amount(self):
        """Test formatting decimal amount."""
        result = self.formatter.format_currency(1234.56, "ru_RU")
        
        self.assertIn("1 234", result)  # Thousand separator
        self.assertIn("₽", result)

    def test_format_currency_custom_config(self):
        """Test formatting with custom configuration."""
        custom_config = CurrencyConfig(
            code="EUR",
            symbol="€",
            symbol_position="after",
            decimal_places=2,
            locale="de_DE"
        )
        formatter = CurrencyFormatter(custom_config)
        
        result = formatter.format_currency(1000)
        
        self.assertIn("1 000", result)
        self.assertIn("€", result)

    @patch('app.utils.currency.BABEL_AVAILABLE', False)
    def test_fallback_formatting_without_babel(self):
        """Test fallback formatting when babel is not available."""
        # Reset formatter to use fallback
        formatter = CurrencyFormatter()
        
        result = formatter.format_currency(1000, "ru_RU")
        
        # Should still format correctly with fallback
        self.assertIn("1000", result)
        self.assertIn("₽", result)

    def test_convenience_function(self):
        """Test the convenience format_currency function."""
        result = format_currency(500, "ru_RU")
        
        self.assertIn("500", result)
        self.assertIn("₽", result)

    def test_format_currency_with_custom_options(self):
        """Test format_currency with custom options."""
        from app.utils.currency import format_currency_with_options
        result = format_currency_with_options(1000, {
            'currency': 'USD',
            'locale': 'en_US',
            'symbol_position': 'before',
            'decimal_places': 2
        })
        
        self.assertIn("$1,000.00", result)

    def test_unsupported_locale_fallback(self):
        """Test fallback for unsupported locale."""
        result = self.formatter.format_currency(1000, "unsupported_locale")
        
        # Should fallback to basic formatting with default config
        self.assertIn("1 000", result)
        self.assertIn("₽", result)

    def test_large_number_formatting(self):
        """Test formatting large numbers."""
        result = self.formatter.format_currency(1000000, "ru_RU")
        
        # Should format with proper thousand separators
        self.assertIn("1 000 000", result)
        self.assertIn("₽", result)

    def test_negative_amount_formatting(self):
        """Test formatting negative amounts."""
        result = self.formatter.format_currency(-500, "ru_RU")
        
        # Should handle negative numbers
        self.assertIn("-500", result)
        self.assertIn("₽", result)


class TestCurrencyConfig(unittest.TestCase):
    """Test cases for CurrencyConfig dataclass."""

    def test_default_currency_config(self):
        """Test default CurrencyConfig values."""
        config = CurrencyConfig()
        
        self.assertEqual(config.code, "RUB")
        self.assertEqual(config.symbol, "₽")
        self.assertEqual(config.symbol_position, "after")
        self.assertEqual(config.decimal_places, 0)
        self.assertEqual(config.locale, "ru_RU")

    def test_custom_currency_config(self):
        """Test custom CurrencyConfig values."""
        config = CurrencyConfig(
            code="USD",
            symbol="$",
            symbol_position="before",
            decimal_places=2,
            locale="en_US"
        )
        
        self.assertEqual(config.code, "USD")
        self.assertEqual(config.symbol, "$")
        self.assertEqual(config.symbol_position, "before")
        self.assertEqual(config.decimal_places, 2)
        self.assertEqual(config.locale, "en_US")


if __name__ == '__main__':
    unittest.main()
