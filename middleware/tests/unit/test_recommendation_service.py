import json
from unittest.mock import Mock, patch

import pytest

from app.services.recommendation_service import ProductRecommendationService


@pytest.fixture
def mock_db():
    mock_conn = Mock()
    mock_db = Mock()
    mock_db.connect.return_value = mock_conn
    return mock_db, mock_conn


@pytest.fixture
def mock_redis():
    mock_r = Mock()
    mock_r.get.return_value = None
    mock_r.setex.return_value = True
    mock_r.delete.return_value = True
    return mock_r


class TestProductRecommendationService:
    def test_get_recommendations_cache_key_includes_exclude_recent(self, mock_db, mock_redis):
        """Test that cached recommendations are separated by exclude_recent mode."""
        mock_db_instance, mock_conn = mock_db

        cached_recommendations = [
            {
                "id": 1,
                "code": "PROD-1",
                "name": "Test Product",
                "category": "coffee",
                "price": 100,
                "reason": "Cached result",
                "context": "general",
                "message": "Cached message",
            }
        ]

        def redis_get_side_effect(key):
            if key.endswith(":1"):
                return json.dumps(cached_recommendations)
            return None

        mock_redis.get.side_effect = redis_get_side_effect

        service = ProductRecommendationService()
        service.db = mock_db_instance

        with patch("app.services.recommendation_service.get_redis", return_value=mock_redis), patch.object(
            service,
            "analyze_customer_preferences",
            return_value={"top_categories": [], "preferred_visit_hour": None},
        ):
            cached_result = service.get_recommendations(
                customer_id=42,
                context="general",
                limit=3,
                exclude_recent=True,
            )

            fresh_result = service.get_recommendations(
                customer_id=42,
                context="general",
                limit=3,
                exclude_recent=False,
            )

        assert cached_result == cached_recommendations
        assert fresh_result == []
        assert mock_redis.get.call_count == 2
        mock_redis.get.assert_any_call("recommendations:42:general:3:1")
        mock_redis.get.assert_any_call("recommendations:42:general:3:0")
        assert mock_conn.execute.called
