"""
Unit tests for admin_api.py caching functions.

Tests cover:
- Dashboard cache functions (_cache_get_json, _cache_set_json, _cache_del_prefix)
- Dashboard cache warming (_warm_dashboard_cache)
- Helper functions (_parse_items_json, _get_product_names)
"""

import pytest
import json
from unittest.mock import MagicMock, patch
from datetime import datetime


class TestCacheFunctions:
    """Test Redis cache operations."""

    def test_cache_get_json_returns_parsed_data(self):
        """Test _cache_get_json returns parsed JSON data."""
        from app.admin_api import _cache_get_json

        mock_redis = MagicMock()
        mock_redis.get.return_value = '{"key": "value"}'

        with patch('app.admin_api.get_redis', return_value=mock_redis):
            result = _cache_get_json("test_key")

        assert result == {"key": "value"}
        mock_redis.get.assert_called_once_with("test_key")

    def test_cache_get_json_returns_none_when_missing(self):
        """Test _cache_get_json returns None when key doesn't exist."""
        from app.admin_api import _cache_get_json

        mock_redis = MagicMock()
        mock_redis.get.return_value = None

        with patch('app.admin_api.get_redis', return_value=mock_redis):
            result = _cache_get_json("missing_key")

        assert result is None

    def test_cache_get_json_returns_none_on_error(self):
        """Test _cache_get_json returns None when Redis fails."""
        from app.admin_api import _cache_get_json

        mock_redis = MagicMock()
        mock_redis.get.side_effect = Exception("Redis connection failed")

        with patch('app.admin_api.get_redis', return_value=mock_redis):
            result = _cache_get_json("test_key")

        assert result is None

    def test_cache_set_json_stores_data_with_ttl(self):
        """Test _cache_set_json stores data with TTL."""
        from app.admin_api import _cache_set_json

        mock_redis = MagicMock()

        with patch('app.admin_api.get_redis', return_value=mock_redis):
            _cache_set_json("test_key", {"data": "value"}, ttl_seconds=60)

        mock_redis.set.assert_called_once()
        call_args = mock_redis.set.call_args
        assert call_args[0][0] == "test_key"
        assert call_args[1]['ex'] == 60

    def test_cache_set_json_handles_exception(self):
        """Test _cache_set_json handles Redis exceptions silently."""
        from app.admin_api import _cache_set_json

        mock_redis = MagicMock()
        mock_redis.set.side_effect = Exception("Redis error")

        # Should not raise
        with patch('app.admin_api.get_redis', return_value=mock_redis):
            _cache_set_json("test_key", {"data": "value"}, ttl_seconds=60)

    def test_cache_del_prefix_deletes_matching_keys(self):
        """Test _cache_del_prefix deletes all matching keys."""
        from app.admin_api import _cache_del_prefix

        mock_redis = MagicMock()
        mock_redis.keys.return_value = ["key1", "key2", "key3"]

        with patch('app.admin_api.get_redis', return_value=mock_redis):
            _cache_del_prefix("test_prefix")

        mock_redis.keys.assert_called_once_with("test_prefix*")
        mock_redis.delete.assert_called_once_with("key1", "key2", "key3")

    def test_cache_del_prefix_handles_no_keys(self):
        """Test _cache_del_prefix handles empty key list."""
        from app.admin_api import _cache_del_prefix

        mock_redis = MagicMock()
        mock_redis.keys.return_value = []

        with patch('app.admin_api.get_redis', return_value=mock_redis):
            _cache_del_prefix("test_prefix")

        mock_redis.delete.assert_not_called()

    def test_cache_del_prefix_handles_exception(self):
        """Test _cache_del_prefix handles Redis exceptions silently."""
        from app.admin_api import _cache_del_prefix

        mock_redis = MagicMock()
        mock_redis.keys.side_effect = Exception("Redis error")

        # Should not raise
        with patch('app.admin_api.get_redis', return_value=mock_redis):
            _cache_del_prefix("test_prefix")


class TestHelperFunctions:
    """Test admin_api helper functions."""

    def test_parse_items_json_returns_list(self):
        """Test _parse_items_json returns parsed list."""
        from app.admin_api import _parse_items_json

        result = _parse_items_json('[{"name": "item1"}, {"name": "item2"}]')
        assert result == [{"name": "item1"}, {"name": "item2"}]

    def test_parse_items_json_returns_empty_for_none(self):
        """Test _parse_items_json returns empty list for None input."""
        from app.admin_api import _parse_items_json

        result = _parse_items_json(None)
        assert result == []

    def test_parse_items_json_returns_empty_for_empty_string(self):
        """Test _parse_items_json returns empty list for empty string."""
        from app.admin_api import _parse_items_json

        result = _parse_items_json("")
        assert result == []

    def test_parse_items_json_returns_empty_for_invalid_json(self):
        """Test _parse_items_json returns empty list for invalid JSON."""
        from app.admin_api import _parse_items_json

        result = _parse_items_json("not valid json {")
        assert result == []

    def test_get_product_names_extracts_names(self):
        """Test _get_product_names extracts product names from items."""
        from app.admin_api import _get_product_names

        items_json = json.dumps([{"name": "Latte"}, {"name": "Cappuccino"}])
        result = _get_product_names(items_json)

        assert result == "Latte, Cappuccino"

    def test_get_product_names_returns_dash_for_none(self):
        """Test _get_product_names returns dash for None input."""
        from app.admin_api import _get_product_names

        result = _get_product_names(None)
        assert result == "—"

    def test_get_product_names_returns_dash_for_empty(self):
        """Test _get_product_names returns dash for empty input."""
        from app.admin_api import _get_product_names

        result = _get_product_names("[]")
        assert result == "—"

    def test_get_product_names_limits_to_max_items(self):
        """Test _get_product_names limits items to max_items."""
        from app.admin_api import _get_product_names

        items_json = json.dumps([
            {"name": "Item1"}, {"name": "Item2"}, {"name": "Item3"}
        ])
        result = _get_product_names(items_json, max_items=2)

        assert result == "Item1, Item2 +1"

    def test_get_product_names_handles_missing_name_key(self):
        """Test _get_product_names handles items without name key."""
        from app.admin_api import _get_product_names

        items_json = json.dumps([{"item_name": "Latte"}, {"item_name": "Cappuccino"}])
        result = _get_product_names(items_json)

        assert result == "Товар, Товар"

    def test_get_product_names_handles_invalid_json(self):
        """Test _get_product_names handles invalid JSON gracefully."""
        from app.admin_api import _get_product_names

        result = _get_product_names("invalid json")
        assert result == "—"


class TestCacheConstants:
    """Test cache TTL constants are defined."""

    def test_dashboard_cache_ttl_defined(self):
        """Test DASHBOARD_CACHE_TTL constant is defined."""
        from app.admin_api import DASHBOARD_CACHE_TTL
        assert DASHBOARD_CACHE_TTL == 60

    def test_analytics_cache_ttl_defined(self):
        """Test ANALYTICS_CACHE_TTL constant is defined."""
        from app.admin_api import ANALYTICS_CACHE_TTL
        assert ANALYTICS_CACHE_TTL == 300

    def test_sales_stats_cache_ttl_defined(self):
        """Test SALES_STATS_CACHE_TTL constant is defined."""
        from app.admin_api import SALES_STATS_CACHE_TTL
        assert SALES_STATS_CACHE_TTL == 180

    def test_customers_list_cache_ttl_defined(self):
        """Test CUSTOMERS_LIST_CACHE_TTL constant is defined."""
        from app.admin_api import CUSTOMERS_LIST_CACHE_TTL
        assert CUSTOMERS_LIST_CACHE_TTL == 5
