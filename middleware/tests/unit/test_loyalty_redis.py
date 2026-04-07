from unittest.mock import MagicMock, patch

import pytest

from app.loyalty import (
    LoyaltyRules,
    batch_update_scores,
    bulk_increment_scores,
    calculate_user_tier,
    get_leaderboard_count,
    get_rank_range,
    get_tier_from_percentile,
    get_tier_leaderboard,
    get_top_spenders,
    get_user_percentile,
    get_user_rank,
    get_user_score,
    get_user_tier_rank,
    get_users_in_tier,
    increment_user_spent_score,
    remove_user_from_leaderboard,
    update_user_spent_score,
)


class TestRedisLoyaltyOperations:
    """Tests for Redis-based loyalty operations using mocking."""

    @patch("app.loyalty._get_redis")
    def test_update_user_spent_score(self, mock_get_redis):
        """Test updating a user's spent score."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis

        update_user_spent_score(123, 5000)
        mock_redis.zadd.assert_called_once_with("crm:leaderboard:spent", {"123": 5000})

    @patch("app.loyalty._get_redis")
    def test_update_user_spent_score_redis_unavailable(self, mock_get_redis):
        """Test handling Redis unavailability for update."""
        mock_get_redis.return_value = None
        update_user_spent_score(123, 5000)
        # Should not raise exception

    @patch("app.loyalty._get_redis")
    def test_increment_user_spent_score(self, mock_get_redis):
        """Test incrementing a user's spent score."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zincrby.return_value = 6000.0

        result = increment_user_spent_score(123, 1000)
        assert result == 6000
        mock_redis.zincrby.assert_called_once_with("crm:leaderboard:spent", 1000, "123")

    @patch("app.loyalty._get_redis")
    def test_increment_user_spent_score_redis_unavailable(self, mock_get_redis):
        """Test handling Redis unavailability for increment."""
        mock_get_redis.return_value = None
        with pytest.raises(RuntimeError, match="Loyalty system unavailable"):
            increment_user_spent_score(123, 1000)

    @patch("app.loyalty._get_redis")
    def test_get_user_rank(self, mock_get_redis):
        """Test getting user rank from leaderboard."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zrevrank.return_value = 5

        rank = get_user_rank(123)
        assert rank == 5
        mock_redis.zrevrank.assert_called_once_with("crm:leaderboard:spent", "123")

    @patch("app.loyalty._get_redis")
    def test_get_user_rank_not_found(self, mock_get_redis):
        """Test user not found in leaderboard."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zrevrank.return_value = None

        rank = get_user_rank(999)
        assert rank is None

    @patch("app.loyalty._get_redis")
    def test_get_user_percentile(self, mock_get_redis):
        """Test getting user percentile rank."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zrevrank.return_value = 5
        mock_redis.zcard.return_value = 100

        percentile = get_user_percentile(123)
        assert percentile is not None
        assert 94.0 <= percentile <= 94.5

    @patch("app.loyalty._get_redis")
    def test_get_top_spenders(self, mock_get_redis):
        """Test getting top spenders leaderboard."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zrevrange.return_value = [
            ("101", 15000.0),
            ("102", 12000.0),
            ("103", 9000.0),
        ]

        top_spenders = get_top_spenders(3)
        assert len(top_spenders) == 3
        assert top_spenders[0] == (101, 15000)
        assert top_spenders[1] == (102, 12000)
        assert top_spenders[2] == (103, 9000)

    @patch("app.loyalty._get_redis")
    def test_get_tier_from_percentile(self, mock_get_redis):
        """Test tier determination from percentile."""
        rules = LoyaltyRules()

        # Platinum (>=99%)
        platinum_tier = get_tier_from_percentile(99.5, rules)
        assert platinum_tier.name == "Платина"

        # Gold (>=95%)
        gold_tier = get_tier_from_percentile(96.0, rules)
        assert gold_tier.name == "Золото"

        # Silver (>=80%)
        silver_tier = get_tier_from_percentile(85.0, rules)
        assert silver_tier.name == "Серебро"

        # Base (<80%)
        base_tier = get_tier_from_percentile(75.0, rules)
        assert base_tier.name == "Базовый"

    @patch("app.loyalty._get_redis")
    def test_get_users_in_tier(self, mock_get_redis):
        """Test getting users in a specific tier."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zrangebyscore.return_value = ["101", "102", "103"]

        rules = LoyaltyRules()
        users = get_users_in_tier("Серебро", rules)
        assert users == [101, 102, 103]

    @patch("app.loyalty._get_redis")
    def test_batch_update_scores(self, mock_get_redis):
        """Test batch updating multiple user scores."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis

        updates = [(101, 5000), (102, 7500), (103, 10000)]
        batch_update_scores(updates)
        mock_redis.zadd.assert_called_once()

    @patch("app.loyalty._get_redis")
    def test_get_user_score(self, mock_get_redis):
        """Test getting user's current score."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zscore.return_value = 5000.0

        score = get_user_score(123)
        assert score == 5000

    @patch("app.loyalty._get_redis")
    def test_remove_user_from_leaderboard(self, mock_get_redis):
        """Test removing user from leaderboard."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis

        remove_user_from_leaderboard(123)
        mock_redis.zrem.assert_called_once_with("crm:leaderboard:spent", "123")

    @patch("app.loyalty._get_redis")
    def test_get_leaderboard_count(self, mock_get_redis):
        """Test getting leaderboard count."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zcard.return_value = 150

        count = get_leaderboard_count()
        assert count == 150

    @patch("app.loyalty._get_redis")
    def test_get_rank_range(self, mock_get_redis):
        """Test getting a range of ranks."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zrevrange.return_value = [("101", 15000.0), ("102", 12000.0)]

        rank_range = get_rank_range(0, 1)
        assert len(rank_range) == 2
        assert rank_range[0][0] == 0
        assert rank_range[0][1] == 101
        assert rank_range[0][2] == 15000

    @patch("app.loyalty._get_redis")
    def test_calculate_user_tier(self, mock_get_redis):
        """Test calculating user tier from Redis score."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zscore.return_value = 15000.0

        rules = LoyaltyRules()
        tier, remaining = calculate_user_tier(123, rules)
        # Check that tier is not base (we're testing with 15000 spent)
        assert tier.min_spent > 0
        assert remaining > 0

    @patch("app.loyalty._get_redis")
    def test_get_tier_leaderboard(self, mock_get_redis):
        """Test getting leaderboard for specific tier."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zrangebyscore.return_value = [("101", 15000.0), ("102", 12000.0)]

        rules = LoyaltyRules()
        leaderboard = get_tier_leaderboard("Золото", rules)
        assert len(leaderboard) == 2
        assert leaderboard[0][1] == 101
        assert leaderboard[0][2] == 15000

    @patch("app.loyalty._get_redis")
    def test_get_user_tier_rank(self, mock_get_redis):
        """Test getting user rank within their tier."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_redis.zrevrank.return_value = 5

        rank = get_user_tier_rank(123)
        assert rank == 5

    @patch("app.loyalty._get_redis")
    def test_bulk_increment_scores(self, mock_get_redis):
        """Test bulk incrementing scores with pipeline."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis
        mock_pipeline = MagicMock()
        mock_redis.pipeline.return_value = mock_pipeline
        mock_pipeline.execute.return_value = [5000.0, 7500.0, 10000.0]

        updates = [(101, 1000), (102, 1500), (103, 2000)]
        results = bulk_increment_scores(updates)
        assert len(results) == 3
        assert results == [5000, 7500, 10000]
