"""
Unit tests for app.security module.

Covers:
- hash_password: PBKDF2 password hashing
- new_salt: cryptographically secure salt generation
- constant_time_equals: timing attack resistant comparison
"""

import pytest
from app.security import hash_password, new_salt, constant_time_equals


class TestHashPassword:
    """Tests for hash_password function."""

    def test_hash_password_returns_hex_string(self):
        """hash_password should return a hex string of length 64 (256 bits)."""
        result = hash_password("password", "salt", 100000)
        assert isinstance(result, str)
        assert len(result) == 64
        assert all(c in "0123456789abcdef" for c in result)

    def test_hash_password_deterministic(self):
        """Same inputs should produce same output."""
        result1 = hash_password("password", "salt", 100000)
        result2 = hash_password("password", "salt", 100000)
        assert result1 == result2

    def test_hash_password_different_salts_produce_different_hashes(self):
        """Different salts should produce different hashes."""
        result1 = hash_password("password", "salt1", 100000)
        result2 = hash_password("password", "salt2", 100000)
        assert result1 != result2

    def test_hash_password_different_passwords_produce_different_hashes(self):
        """Different passwords should produce different hashes."""
        result1 = hash_password("password1", "salt", 100000)
        result2 = hash_password("password2", "salt", 100000)
        assert result1 != result2

    def test_hash_password_different_iterations_produce_different_hashes(self):
        """Different iteration counts should produce different hashes."""
        result1 = hash_password("password", "salt", 100000)
        result2 = hash_password("password", "salt", 200000)
        assert result1 != result2

    def test_hash_password_unicode_support(self):
        """Should handle unicode passwords correctly."""
        result = hash_password("пароль", "соль", 100000)
        assert isinstance(result, str)
        assert len(result) == 64


class TestNewSalt:
    """Tests for new_salt function."""

    def test_new_salt_returns_string(self):
        """new_salt should return a string."""
        salt = new_salt()
        assert isinstance(salt, str)

    def test_new_salt_returns_different_values(self):
        """Each call should return a different salt."""
        salts = [new_salt() for _ in range(10)]
        assert len(set(salts)) == 10  # All unique

    def test_new_salt_urlsafe(self):
        """Salt should be URL-safe base64."""
        salt = new_salt()
        # URL-safe base64 uses - and _ instead of + and /
        assert all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-=" for c in salt)


class TestConstantTimeEquals:
    """Tests for constant_time_equals function."""

    def test_equal_strings_return_true(self):
        """Equal strings should return True."""
        assert constant_time_equals("hello", "hello") is True

    def test_different_strings_return_false(self):
        """Different strings should return False."""
        assert constant_time_equals("hello", "world") is False

    def test_different_lengths_return_false(self):
        """Strings of different lengths should return False."""
        assert constant_time_equals("hello", "hell") is False

    def test_empty_strings_equal(self):
        """Two empty strings should be equal."""
        assert constant_time_equals("", "") is True

    def test_empty_vs_non_empty(self):
        """Empty vs non-empty should return False."""
        assert constant_time_equals("", "hello") is False

    def test_unicode_strings(self):
        """Should handle unicode strings correctly."""
        assert constant_time_equals("привет", "привет") is True
        assert constant_time_equals("привет", "мир") is False
