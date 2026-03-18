from unittest.mock import MagicMock, patch

import pytest

from app.tma_api import validate_init_data


class TestTMAAPI:
    """Tests for TMA API functions."""

    def test_validate_init_data_valid(self):
        """Test validating valid Telegram Mini App init data."""
        # This is a simplified test - real validation would require actual TMA data
        # For testing purposes, we'll mock the validation
        with patch("app.tma_api.hmac") as mock_hmac:
            mock_hmac.new().digest.return_value = b"secret"
            mock_hmac.new().hexdigest.return_value = "valid_hash"

            with patch("app.tma_api.parse_qsl") as mock_parse:
                mock_parse.return_value = [
                    ("hash", "valid_hash"),
                    ("user", '{"id": 12345, "first_name": "Test User"}'),
                ]

                result = validate_init_data("valid_init_data", "test_bot_token")
                assert result is not None
                assert "id" in result

    def test_validate_init_data_missing_hash(self):
        """Test validation with missing hash."""
        with patch("app.tma_api.parse_qsl") as mock_parse:
            mock_parse.return_value = [("user", '{"id": 12345}')]

            with pytest.raises(ValueError):
                validate_init_data("missing_hash", "test_bot_token")

    def test_validate_init_data_invalid_hash(self):
        """Test validation with invalid hash."""
        with patch("app.tma_api.hmac") as mock_hmac:
            mock_hmac.new().digest.return_value = b"secret"
            mock_hmac.new().hexdigest.return_value = "invalid_hash"

            with patch("app.tma_api.parse_qsl") as mock_parse:
                mock_parse.return_value = [
                    ("hash", "valid_hash"),
                    ("user", '{"id": 12345}'),
                ]

                with pytest.raises(ValueError):
                    validate_init_data("invalid_hash_data", "test_bot_token")
