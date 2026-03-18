"""
Integration tests for currency formatting and gender correction.
Tests the complete workflow from customer creation to display formatting.
"""

import unittest
from unittest.mock import patch

from app.utils.currency import format_currency, get_currency_formatter
from app.utils.gender_correction import suggest_name_correction
from app.identify import normalize_name


class TestCurrencyGenderIntegration(unittest.TestCase):
    """Integration tests for currency and gender systems."""

    def test_currency_formatting_integration(self):
        """Test currency formatting across different locales."""
        # Test Russian formatting
        result = format_currency(1234.56, "ru_RU")
        self.assertIn("1 234", result)
        self.assertIn("₽", result)

        # Test English formatting
        result = format_currency(1234.56, "en_US")
        self.assertIn("$1,234.56", result)

        # Test Serbian formatting
        result = format_currency(1234.56, "sr_RS")
        self.assertIn("1.235", result)  # Serbian rounds to nearest
        self.assertIn("RSD", result)

    def test_gender_correction_integration(self):
        """Test gender correction across different locales."""
        # Test Russian correction
        result = suggest_name_correction("Александра Иванов", "ru")
        self.assertIsNotNone(result.get("warning"))
        self.assertEqual(result.get("suggested_name"), "Александра Иванова")
        self.assertEqual(result.get("detected_gender"), "female")

        # Test English (no correction needed)
        result = suggest_name_correction("Mary Smith", "en")
        self.assertIsNone(result.get("warning"))

        # Test Serbian (no correction needed)
        result = suggest_name_correction("Марија Јовановић", "sr")
        self.assertIsNone(result.get("warning"))
        self.assertEqual(result.get("detected_gender"), "female")

    def test_normalize_name_with_gender_check(self):
        """Test normalize_name function with gender checking."""
        # Test Russian name with gender mismatch
        result = normalize_name("Александра Иванов", "ru", check_gender=True)

        self.assertEqual(result.get("normalized"), "Александра Иванов")
        self.assertIsNotNone(result.get("gender_warning"))
        self.assertEqual(result.get("suggestions"), "Александра Иванова")
        self.assertEqual(result.get("detected_gender"), "female")

        # Test name without gender checking
        result = normalize_name("Александр Иванов", "ru", check_gender=False)

        self.assertEqual(result.get("normalized"), "Александр Иванов")
        self.assertIsNone(result.get("gender_warning"))
        self.assertIsNone(result.get("suggestions"))
        self.assertEqual(result.get("detected_gender"), "unknown")

    def test_customer_creation_workflow(self):
        """Test complete customer creation workflow."""
        # Simulate customer data with potential gender mismatch
        customer_data = {"full_name": "Александра Петров", "phone": "+79998887755"}

        # Normalize name with gender checking
        name_result = normalize_name(
            customer_data["full_name"], "ru", check_gender=True
        )

        # Verify gender detection
        self.assertEqual(name_result["detected_gender"], "female")
        self.assertIsNotNone(name_result["gender_warning"])
        self.assertEqual(name_result["suggestions"], "Александра Петрова")

        # Format currency for display
        balance = 1000.50
        formatted_balance = format_currency(balance, "ru_RU")

        self.assertIn("1 000", formatted_balance)
        self.assertIn("₽", formatted_balance)

    def test_multi_locale_customer_workflow(self):
        """Test customer workflow across different locales."""
        test_cases = [
            {
                "locale": "ru",
                "name": "Александра Иванов",
                "amount": 1234.56,
                "expected_gender": "female",
                "expected_suggestion": "Александра Иванова",
                "expected_currency": "1 234,56 ₽",
            },
            {
                "locale": "en",
                "name": "Mary Smith",
                "amount": 1234.56,
                "expected_gender": "female",
                "expected_suggestion": None,
                "expected_currency": "$1,234.56",
            },
            {
                "locale": "sr",
                "name": "Марија Јовановић",
                "amount": 1234.56,
                "expected_gender": "female",
                "expected_suggestion": None,
                "expected_currency": "1.235 RSD",
            },
        ]

        for case in test_cases:
            with self.subTest(locale=case["locale"]):
                # Test gender correction
                name_result = normalize_name(
                    case["name"], case["locale"], check_gender=True
                )
                self.assertEqual(
                    name_result["detected_gender"], case["expected_gender"]
                )
                self.assertEqual(
                    name_result["suggestions"], case["expected_suggestion"]
                )

                # Test currency formatting
                locale_map = {"ru": "ru_RU", "en": "en_US", "sr": "sr_RS"}
                currency_result = format_currency(
                    case["amount"], locale_map[case["locale"]]
                )
                self.assertIn(case["expected_currency"], currency_result)

    def test_edge_cases_integration(self):
        """Test edge cases in integration."""
        # Test empty name
        result = normalize_name("", "ru", check_gender=True)
        self.assertEqual(result["normalized"], "")
        self.assertIsNone(result["gender_warning"])
        self.assertEqual(result["detected_gender"], "unknown")

        # Test zero amount
        result = format_currency(0, "ru_RU")
        self.assertIn("0", result)
        self.assertIn("₽", result)

        # Test negative amount
        result = format_currency(-500, "ru_RU")
        self.assertIn("-500", result)
        self.assertIn("₽", result)

    def test_performance_integration(self):
        """Test performance of integrated systems."""
        import time

        # Test multiple currency formatting operations
        start_time = time.time()
        for i in range(100):
            format_currency(1234.56 + i, "ru_RU")
        currency_time = time.time() - start_time

        # Test multiple gender correction operations
        start_time = time.time()
        for i in range(100):
            normalize_name(f"Александр Иванов {i}", "ru", check_gender=True)
        gender_time = time.time() - start_time

        # Performance should be reasonable (less than 1 second for 100 operations)
        self.assertLess(currency_time, 1.0)
        self.assertLess(gender_time, 1.0)

    def test_concurrent_access(self):
        """Test concurrent access to currency and gender systems."""
        import threading
        import time

        results = []

        def worker():
            # Simulate concurrent operations
            for i in range(10):
                currency_result = format_currency(1000 + i, "ru_RU")
                gender_result = normalize_name(
                    f"Александр Иванов {i}", "ru", check_gender=True
                )
                results.append((currency_result, gender_result["detected_gender"]))

        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=worker)
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Verify all operations completed successfully
        self.assertEqual(len(results), 50)  # 5 threads * 10 operations each

        # Verify results are consistent
        for currency_result, gender in results:
            self.assertIn("1", currency_result)
            self.assertIn("₽", currency_result)
            self.assertIn(gender, ["male", "unknown"])

    @patch("app.utils.currency.BABEL_AVAILABLE", False)
    def test_fallback_integration(self):
        """Test integration when babel is not available."""
        # Should still work with fallback formatting
        result = format_currency(1234.56, "ru_RU")
        self.assertIn("1235", result)  # Fallback rounds differently
        self.assertIn("₽", result)

    def test_locale_configuration_integration(self):
        """Test integration with different locale configurations."""
        formatter = get_currency_formatter()

        # Test default configuration
        config = formatter.get_config()
        self.assertEqual(config.code, "RUB")
        self.assertEqual(config.locale, "ru_RU")

        # Test formatting with different locales
        ru_result = formatter.format_currency(1000, "ru_RU")
        en_result = formatter.format_currency(1000, "en_US")

        self.assertIn("₽", ru_result)
        self.assertIn("$", en_result)
        self.assertNotEqual(ru_result, en_result)

    def test_error_handling_integration(self):
        """Test error handling in integrated systems."""
        # Test invalid locale
        result = format_currency(1000, "invalid_locale")
        self.assertIn("1 000", result)  # Should fallback to default formatting

        # Test invalid name format
        result = normalize_name("123", "ru", check_gender=True)
        self.assertEqual(result["detected_gender"], "unknown")
        self.assertIsNone(result["gender_warning"])


if __name__ == "__main__":
    unittest.main()
