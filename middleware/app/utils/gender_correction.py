"""
Gender detection and surname correction utilities.
Supports Russian, English, and Serbian names with gender-based surname correction.
"""

import json
import os
from functools import lru_cache
from typing import Dict, Optional, Tuple


class GenderDetector:
    """Detect gender from names and suggest surname corrections."""

    def __init__(self):
        self._name_data: Dict[str, Dict] = {}
        self._load_name_data()

    def _load_name_data(self):
        """Load name dictionaries from JSON files."""
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")

        for locale in ["ru", "sr", "en"]:
            file_path = os.path.join(data_dir, f"{locale}_names_gender.json")
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    self._name_data[locale] = json.load(f)
            except FileNotFoundError:
                # If file doesn't exist, create empty structure
                self._name_data[locale] = {
                    "male_names": [],
                    "female_names": [],
                    "neutral_names": [],
                    "male_surnames": [],
                    "female_surnames": [],
                }

    @lru_cache(maxsize=1000)
    def detect_gender(self, name: str, locale: str = "ru") -> str:
        """
        Detect gender from first name.

        Args:
            name: First name to analyze
            locale: Language locale ('ru', 'sr', 'en')

        Returns:
            'male', 'female', 'neutral', or 'unknown'
        """
        if not name:
            return "unknown"

        name = name.strip().lower()
        locale_data = self._name_data.get(locale, {})

        # Check neutral names first (they take priority over gendered names)
        for neutral_name in locale_data.get("neutral_names", []):
            if neutral_name.lower() == name:
                return "neutral"

        # Check male names
        for male_name in locale_data.get("male_names", []):
            if male_name.lower() == name:
                return "male"

        # Check female names
        for female_name in locale_data.get("female_names", []):
            if female_name.lower() == name:
                return "female"

        return "unknown"

    def suggest_correction(self, full_name: str, locale: str = "ru") -> Dict:
        """
        Suggest gender-based surname correction.

        Args:
            full_name: Full name to analyze
            locale: Language locale

        Returns:
            Dictionary with correction suggestions
        """
        if not full_name:
            return {
                "warning": None,
                "suggested_name": None,
                "original_name": None,
                "detected_gender": "unknown",
            }

        # Split name into parts
        parts = full_name.strip().split()
        if len(parts) < 2:
            # For single names, still detect gender but no surname correction
            detected_gender = self.detect_gender(parts[0], locale)
            return {
                "warning": None,
                "suggested_name": None,
                "original_name": full_name,
                "detected_gender": detected_gender,
            }

        first_name = parts[0]
        surname = parts[-1]

        # Detect gender from first name
        detected_gender = self.detect_gender(first_name, locale)

        if detected_gender in ["unknown", "neutral"]:
            return {
                "warning": None,
                "suggested_name": None,
                "original_name": full_name,
                "detected_gender": detected_gender,
            }

        # Check if surname matches detected gender
        locale_data = self._name_data.get(locale, {})
        surname_matches = self._surname_matches_gender(
            surname, detected_gender, locale_data
        )

        if surname_matches:
            return {
                "warning": None,
                "suggested_name": None,
                "original_name": full_name,
                "detected_gender": detected_gender,
            }

        # Suggest correction
        corrected_surname = self._correct_surname_gender(
            surname, detected_gender, locale_data
        )
        if corrected_surname and corrected_surname != surname:
            # Preserve middle names if present
            if len(parts) > 2:
                middle_names = " ".join(parts[1:-1])
                suggested_name = f"{first_name} {middle_names} {corrected_surname}"
            else:
                suggested_name = f"{first_name} {corrected_surname}"

            # Create warning message based on locale
            gender_text = {
                "ru": {"male": "мужского", "female": "женского"},
                "sr": {"male": "мушког", "female": "женског"},
                "en": {"male": "male", "female": "female"},
            }

            if locale == "ru":
                warning = f"Возможно, имя {gender_text['ru'][detected_gender]} рода — {suggested_name}?"
            elif locale == "sr":
                warning = f"Могуће да је име {gender_text['sr'][detected_gender]} пола — {suggested_name}?"
            else:
                warning = f"Name might be {gender_text['en'][detected_gender]} — {suggested_name}?"

            return {
                "warning": warning,
                "suggested_name": suggested_name,
                "original_name": full_name,
                "detected_gender": detected_gender,
            }

        return {
            "warning": None,
            "suggested_name": None,
            "original_name": full_name,
            "detected_gender": detected_gender,
        }

    def _surname_matches_gender(
        self, surname: str, gender: str, locale_data: Dict
    ) -> bool:
        """Check if surname matches expected gender pattern."""
        surname_lower = surname.lower()

        if gender == "male":
            male_surnames = [s.lower() for s in locale_data.get("male_surnames", [])]
            return surname_lower in male_surnames
        elif gender == "female":
            female_surnames = [
                s.lower() for s in locale_data.get("female_surnames", [])
            ]
            return surname_lower in female_surnames

        return False

    def _correct_surname_gender(
        self, surname: str, target_gender: str, locale_data: Dict
    ) -> Optional[str]:
        """Correct surname to match target gender."""
        surname_lower = surname.lower()

        if target_gender == "male":
            # Look for female version and convert to male
            female_surnames = locale_data.get("female_surnames", [])
            male_surnames = locale_data.get("male_surnames", [])

            for i, female_surname in enumerate(female_surnames):
                if female_surname.lower() == surname_lower:
                    if i < len(male_surnames):
                        return male_surnames[i]

        elif target_gender == "female":
            # Look for male version and convert to female
            male_surnames = locale_data.get("male_surnames", [])
            female_surnames = locale_data.get("female_surnames", [])

            for i, male_surname in enumerate(male_surnames):
                if male_surname.lower() == surname_lower:
                    if i < len(female_surnames):
                        return female_surnames[i]

        return None

    def get_name_statistics(self, locale: str = "ru") -> Dict:
        """Get statistics about loaded name data."""
        locale_data = self._name_data.get(locale, {})

        return {
            "male_names_count": len(locale_data.get("male_names", [])),
            "female_names_count": len(locale_data.get("female_names", [])),
            "neutral_names_count": len(locale_data.get("neutral_names", [])),
            "male_surnames_count": len(locale_data.get("male_surnames", [])),
            "female_surnames_count": len(locale_data.get("female_surnames", [])),
            "total_names": (
                len(locale_data.get("male_names", []))
                + len(locale_data.get("female_names", []))
                + len(locale_data.get("neutral_names", []))
            ),
            "total_surnames": (
                len(locale_data.get("male_surnames", []))
                + len(locale_data.get("female_surnames", []))
            ),
        }


# Global detector instance
_gender_detector = None


def get_gender_detector() -> GenderDetector:
    """Get global gender detector instance."""
    global _gender_detector
    if _gender_detector is None:
        _gender_detector = GenderDetector()
    return _gender_detector


def detect_gender(name: str, locale: str = "ru") -> str:
    """
    Convenience function to detect gender.

    Args:
        name: First name to analyze
        locale: Language locale

    Returns:
        'male', 'female', 'neutral', or 'unknown'
    """
    return get_gender_detector().detect_gender(name, locale)


def suggest_name_correction(full_name: str, locale: str = "ru") -> Dict:
    """
    Convenience function to suggest name correction.

    Args:
        full_name: Full name to analyze
        locale: Language locale

    Returns:
        Dictionary with correction suggestions
    """
    return get_gender_detector().suggest_correction(full_name, locale)
