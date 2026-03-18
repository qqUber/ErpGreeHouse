"""
Unit tests for gender detection and correction functionality.
Tests the GenderDetector class with different locales and name patterns.
"""

import unittest
from unittest.mock import patch, mock_open

from app.utils.gender_correction import GenderDetector, detect_gender, suggest_name_correction


class TestGenderDetector(unittest.TestCase):
    """Test cases for GenderDetector class."""

    def setUp(self):
        """Set up test fixtures."""
        self.detector = GenderDetector()

    def test_detect_gender_russian_male(self):
        """Test detecting male Russian names."""
        self.assertEqual(detect_gender("Александр", "ru"), "male")
        self.assertEqual(detect_gender("Михаил", "ru"), "male")
        self.assertEqual(detect_gender("Иван", "ru"), "male")

    def test_detect_gender_russian_female(self):
        """Test detecting female Russian names."""
        self.assertEqual(detect_gender("Александра", "ru"), "female")
        self.assertEqual(detect_gender("Мария", "ru"), "female")
        self.assertEqual(detect_gender("Елена", "ru"), "female")

    def test_detect_gender_neutral_names(self):
        """Test detecting neutral names."""
        self.assertEqual(detect_gender("Саша", "ru"), "neutral")
        self.assertEqual(detect_gender("Аля", "ru"), "neutral")

    def test_detect_gender_unknown(self):
        """Test detecting unknown names."""
        self.assertEqual(detect_gender("НеизвестноеИмя", "ru"), "unknown")
        self.assertEqual(detect_gender("", "ru"), "unknown")
        self.assertEqual(detect_gender("123", "ru"), "unknown")

    def test_detect_gender_english(self):
        """Test detecting English names."""
        self.assertEqual(detect_gender("James", "en"), "male")
        self.assertEqual(detect_gender("Mary", "en"), "female")
        self.assertEqual(detect_gender("Alex", "en"), "neutral")

    def test_detect_gender_serbian(self):
        """Test detecting Serbian names."""
        self.assertEqual(detect_gender("Александар", "sr"), "male")
        self.assertEqual(detect_gender("Марија", "sr"), "female")
        self.assertEqual(detect_gender("Саша", "sr"), "neutral")

    def test_suggest_correction_russian_male_correct(self):
        """Test suggesting correction for correctly gendered Russian male name."""
        result = suggest_name_correction("Александр Иванов", "ru")
        
        self.assertIsNone(result.get('warning'))
        self.assertIsNone(result.get('suggested_name'))
        self.assertEqual(result.get('detected_gender'), 'male')

    def test_suggest_correction_russian_female_correct(self):
        """Test suggesting correction for correctly gendered Russian female name."""
        result = suggest_name_correction("Александра Иванова", "ru")
        
        self.assertIsNone(result.get('warning'))
        self.assertIsNone(result.get('suggested_name'))
        self.assertEqual(result.get('detected_gender'), 'female')

    def test_suggest_correction_russian_mismatch(self):
        """Test suggesting correction for gender mismatched Russian name."""
        result = suggest_name_correction("Александра Иванов", "ru")
        
        self.assertIsNotNone(result.get('warning'))
        self.assertIsNotNone(result.get('suggested_name'))
        self.assertEqual(result.get('detected_gender'), 'female')
        self.assertEqual(result.get('suggested_name'), "Александра Иванова")
        self.assertIn("Возможно, имя женского рода", result.get('warning'))

    def test_suggest_correction_serbian_mismatch(self):
        """Test suggesting correction for gender mismatched Serbian name."""
        result = suggest_name_correction("Марија Јовановић", "sr")
        
        # In Serbian, surnames don't change by gender, so no correction needed
        self.assertIsNone(result.get('warning'))
        self.assertIsNone(result.get('suggested_name'))
        self.assertEqual(result.get('detected_gender'), 'female')

    def test_suggest_correction_english_mismatch(self):
        """Test suggesting correction for gender mismatched English name."""
        result = suggest_name_correction("Mary Smith", "en")
        
        # In English, surnames don't change by gender, so no correction needed
        self.assertIsNone(result.get('warning'))
        self.assertIsNone(result.get('suggested_name'))
        self.assertEqual(result.get('detected_gender'), 'female')

    def test_suggest_correction_short_name(self):
        """Test suggesting correction for short names (no surname)."""
        result = suggest_name_correction("Александр", "ru")
        
        self.assertIsNone(result.get('warning'))
        self.assertIsNone(result.get('suggested_name'))
        self.assertEqual(result.get('detected_gender'), 'male')

    def test_suggest_correction_empty_name(self):
        """Test suggesting correction for empty name."""
        result = suggest_name_correction("", "ru")
        
        self.assertIsNone(result.get('warning'))
        self.assertIsNone(result.get('suggested_name'))
        self.assertEqual(result.get('detected_gender'), 'unknown')

    def test_suggest_correction_neutral_name(self):
        """Test suggesting correction for neutral names."""
        result = suggest_name_correction("Саша Иванов", "ru")
        
        self.assertIsNone(result.get('warning'))
        self.assertIsNone(result.get('suggested_name'))
        self.assertEqual(result.get('detected_gender'), 'neutral')

    def test_get_name_statistics(self):
        """Test getting name statistics."""
        stats = self.detector.get_name_statistics('ru')
        
        self.assertIn('male_names_count', stats)
        self.assertIn('female_names_count', stats)
        self.assertIn('neutral_names_count', stats)
        self.assertIn('male_surnames_count', stats)
        self.assertIn('female_surnames_count', stats)
        self.assertIn('total_names', stats)
        self.assertIn('total_surnames', stats)
        
        # Verify counts are positive
        self.assertGreater(stats['male_names_count'], 0)
        self.assertGreater(stats['female_names_count'], 0)
        self.assertGreater(stats['male_surnames_count'], 0)
        self.assertGreater(stats['female_surnames_count'], 0)

    def test_case_insensitive_detection(self):
        """Test that gender detection is case insensitive."""
        self.assertEqual(detect_gender("александр", "ru"), "male")
        self.assertEqual(detect_gender("АЛЕКСАНДР", "ru"), "male")
        self.assertEqual(detect_gender("Мария", "ru"), "female")
        self.assertEqual(detect_gender("МАРИЯ", "ru"), "female")

    def test_whitespace_handling(self):
        """Test that whitespace is handled correctly."""
        result = suggest_name_correction("  Александра  Иванов  ", "ru")
        
        self.assertIsNotNone(result.get('warning'))
        self.assertEqual(result.get('detected_gender'), 'female')
        self.assertEqual(result.get('suggested_name'), "Александра Иванова")

    @patch('app.utils.gender_correction.GenderDetector._load_name_data')
    def test_missing_data_file(self, mock_load):
        """Test behavior when data files are missing."""
        # Don't call the real _load_name_data
        mock_load.return_value = None
        
        detector = GenderDetector()
        result = detector.detect_gender("Александр", "ru")
        
        self.assertEqual(result, 'unknown')

    def test_surname_correction_accuracy(self):
        """Test surname correction accuracy for common patterns."""
        # Test male to female
        result = suggest_name_correction("Александра Петров", "ru")
        self.assertEqual(result.get('suggested_name'), "Александра Петрова")
        
        # Test female to male
        result = suggest_name_correction("Александр Петрова", "ru")
        self.assertEqual(result.get('suggested_name'), "Александр Петров")

    def test_multiple_name_parts(self):
        """Test handling of names with multiple parts."""
        result = suggest_name_correction("Александра Иванов Петров", "ru")
        
        self.assertIsNotNone(result.get('warning'))
        self.assertEqual(result.get('detected_gender'), 'female')
        # Should suggest correction for last name only
        self.assertEqual(result.get('suggested_name'), "Александра Иванов Петрова")

    def test_convenience_functions(self):
        """Test convenience functions work correctly."""
        # Test detect_gender convenience function
        self.assertEqual(detect_gender("Александр", "ru"), "male")
        
        # Test suggest_name_correction convenience function
        result = suggest_name_correction("Александра Иванов", "ru")
        self.assertIsNotNone(result.get('warning'))
        self.assertEqual(result.get('detected_gender'), 'female')


class TestGenderDetectorEdgeCases(unittest.TestCase):
    """Test edge cases for gender detection."""

    def setUp(self):
        """Set up test fixtures."""
        self.detector = GenderDetector()

    def test_non_cyrillic_names_in_russian_locale(self):
        """Test handling of non-Cyrillic names in Russian locale."""
        result = detect_gender("John", "ru")
        self.assertEqual(result, 'unknown')

    def test_special_characters(self):
        """Test handling of special characters in names."""
        result = detect_gender("Александр-Иван", "ru")
        self.assertEqual(result, 'unknown')  # Not in our dictionary

    def test_partial_name_matches(self):
        """Test that partial names don't match."""
        result = detect_gender("Алекс", "ru")  # Short version of Александр
        self.assertEqual(result, 'unknown')

    def test_name_with_apostrophe(self):
        """Test names with apostrophes."""
        result = suggest_name_correction("Александра О'Коннел", "ru")
        # Should handle gracefully
        self.assertIsNotNone(result)


if __name__ == '__main__':
    unittest.main()
