"""
Unit tests for loyalty.py core logic functions.

Tests cover:
- calc_earned_points function
- clamp_redeem_points function
- get_tier function
- get_next_tier function
- LoyaltyRules dataclass
"""

from app.loyalty import (
    LoyaltyRules,
    Tier,
    calc_earned_points,
    clamp_redeem_points,
    get_next_tier,
    get_tier,
)


class TestGetTier:
    """Test get_tier function."""

    def test_get_tier_base(self):
        """Test that base tier is returned for zero spent."""
        rules = LoyaltyRules()
        tier = get_tier(0, rules)

        assert tier.name == "Базовый"
        assert tier.min_spent == 0

    def test_get_tier_silver(self):
        """Test silver tier is returned for spent >= 10000."""
        rules = LoyaltyRules()
        tier = get_tier(10000, rules)

        assert tier.name == "Серебро"
        assert tier.min_spent == 10000

    def test_get_tier_gold(self):
        """Test gold tier is returned for spent >= 50000."""
        rules = LoyaltyRules()
        tier = get_tier(50000, rules)

        assert tier.name == "Золото"
        assert tier.min_spent == 50000

    def test_get_tier_platinum(self):
        """Test platinum tier is returned for spent >= 100000."""
        rules = LoyaltyRules()
        tier = get_tier(100000, rules)

        assert tier.name == "Платина"
        assert tier.min_spent == 100000

    def test_get_tier_boundary_silver(self):
        """Test boundary at silver tier threshold."""
        rules = LoyaltyRules()
        tier = get_tier(9999, rules)

        assert tier.name == "Базовый"

    def test_get_tier_boundary_gold(self):
        """Test boundary at gold tier threshold."""
        rules = LoyaltyRules()
        tier = get_tier(49999, rules)

        assert tier.name == "Серебро"


class TestCalcEarnedPoints:
    """Test calc_earned_points function."""

    def test_calc_earned_points_below_minimum(self):
        """Test that no points are earned below minimum amount."""
        rules = LoyaltyRules(min_amount_for_accrual=100)

        result = calc_earned_points(total_amount=50, spent_amount=0, rules=rules)

        assert result == 0

    def test_calc_earned_points_at_minimum(self):
        """Test points earned at exactly minimum amount."""
        rules = LoyaltyRules(min_amount_for_accrual=100)

        result = calc_earned_points(total_amount=100, spent_amount=0, rules=rules)

        # 5% of 100 = 5 (base tier)
        assert result == 5

    def test_calc_earned_points_base_tier(self):
        """Test points earned in base tier (5%)."""
        rules = LoyaltyRules(min_amount_for_accrual=100)

        result = calc_earned_points(total_amount=1000, spent_amount=0, rules=rules)

        # 5% of 1000 = 50
        assert result == 50

    def test_calc_earned_points_silver_tier(self):
        """Test points earned in silver tier (7%)."""
        rules = LoyaltyRules(min_amount_for_accrual=100)

        result = calc_earned_points(total_amount=1000, spent_amount=15000, rules=rules)

        # 7% of 1000 = 70
        assert result == 70

    def test_calc_earned_points_gold_tier(self):
        """Test points earned in gold tier (10%)."""
        rules = LoyaltyRules(min_amount_for_accrual=100)

        result = calc_earned_points(total_amount=1000, spent_amount=60000, rules=rules)

        # 10% of 1000 = 100
        assert result == 100

    def test_calc_earned_points_platinum_tier(self):
        """Test points earned in platinum tier (15%)."""
        rules = LoyaltyRules(min_amount_for_accrual=100)

        result = calc_earned_points(total_amount=1000, spent_amount=150000, rules=rules)

        # 15% of 1000 = 150
        assert result == 150


class TestClampRedeemPoints:
    """Test clamp_redeem_points function."""

    def test_clamp_zero_total(self):
        """Test that zero is returned for zero total amount."""
        rules = LoyaltyRules()

        result = clamp_redeem_points(
            total_amount=0,
            spent_amount=0,
            requested_points=100,
            available_points=100,
            rules=rules,
        )

        assert result == 0

    def test_clamp_zero_requested(self):
        """Test that zero is returned when no points requested."""
        rules = LoyaltyRules()

        result = clamp_redeem_points(
            total_amount=1000,
            spent_amount=0,
            requested_points=0,
            available_points=100,
            rules=rules,
        )

        assert result == 0

    def test_clamp_zero_available(self):
        """Test that zero is returned when no points available."""
        rules = LoyaltyRules()

        result = clamp_redeem_points(
            total_amount=1000,
            spent_amount=0,
            requested_points=100,
            available_points=0,
            rules=rules,
        )

        assert result == 0

    def test_clamp_base_tier(self):
        """Test clamping in base tier (max 30% of total)."""
        rules = LoyaltyRules()

        result = clamp_redeem_points(
            total_amount=1000,
            spent_amount=0,
            requested_points=1000,
            available_points=1000,
            rules=rules,
        )

        # 30% of 1000 = 300, but requested is 1000, so clamped to 300
        assert result == 300

    def test_clamp_silver_tier(self):
        """Test clamping in silver tier (max 50% of total)."""
        rules = LoyaltyRules()

        result = clamp_redeem_points(
            total_amount=1000,
            spent_amount=15000,
            requested_points=1000,
            available_points=1000,
            rules=rules,
        )

        # 50% of 1000 = 500
        assert result == 500

    def test_clamp_gold_tier(self):
        """Test clamping in gold tier (max 100% of total)."""
        rules = LoyaltyRules()

        result = clamp_redeem_points(
            total_amount=1000,
            spent_amount=60000,
            requested_points=2000,
            available_points=2000,
            rules=rules,
        )

        # 100% of 1000 = 1000 (full amount)
        assert result == 1000

    def test_clamp_below_available(self):
        """Test that requested points are returned when below max."""
        rules = LoyaltyRules()

        result = clamp_redeem_points(
            total_amount=1000,
            spent_amount=0,
            requested_points=100,
            available_points=500,
            rules=rules,
        )

        # 30% of 1000 = 300, requested is 100, so return 100
        assert result == 100


class TestGetNextTier:
    """Test get_next_tier function."""

    def test_get_next_tier_from_base(self):
        """Test next tier from base tier."""
        rules = LoyaltyRules()

        next_tier = get_next_tier(0, rules)

        assert next_tier.name == "Серебро"
        assert next_tier.min_spent == 10000

    def test_get_next_tier_from_silver(self):
        """Test next tier from silver tier."""
        rules = LoyaltyRules()

        next_tier = get_next_tier(10000, rules)

        assert next_tier.name == "Золото"
        assert next_tier.min_spent == 50000

    def test_get_next_tier_from_gold(self):
        """Test next tier from gold tier."""
        rules = LoyaltyRules()

        next_tier = get_next_tier(50000, rules)

        assert next_tier.name == "Платина"
        assert next_tier.min_spent == 100000

    def test_get_next_tier_from_platinum(self):
        """Test that None is returned when at highest tier."""
        rules = LoyaltyRules()

        next_tier = get_next_tier(150000, rules)

        assert next_tier is None

    def test_get_next_tier_boundary(self):
        """Test boundary case - just below next tier."""
        rules = LoyaltyRules()

        next_tier = get_next_tier(9999, rules)

        assert next_tier.name == "Серебро"


class TestLoyaltyRules:
    """Test LoyaltyRules dataclass."""

    def test_default_tiers_count(self):
        """Test that default rules have 4 tiers."""
        rules = LoyaltyRules()

        assert len(rules.tiers) == 4

    def test_default_min_amount(self):
        """Test default minimum amount for accrual."""
        rules = LoyaltyRules()

        assert rules.min_amount_for_accrual == 100

    def test_custom_min_amount(self):
        """Test custom minimum amount."""
        rules = LoyaltyRules(min_amount_for_accrual=50)

        assert rules.min_amount_for_accrual == 50


class TestTier:
    """Test Tier dataclass."""

    def test_tier_attributes(self):
        """Test tier has correct attributes."""
        tier = Tier(name="Тест", min_spent=1000, accrual_percent=10, max_redeem_percent=50)

        assert tier.name == "Тест"
        assert tier.min_spent == 1000
        assert tier.accrual_percent == 10
        assert tier.max_redeem_percent == 50
