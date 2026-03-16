import pytest
from app.loyalty import (
    LoyaltyRules,
    Tier,
    calc_earned_points,
    clamp_redeem_points,
    get_tier,
)


@pytest.fixture
def standard_rules():
    return LoyaltyRules()


def test_get_tier_boundaries(standard_rules):
    # Base Tier
    assert get_tier(0, standard_rules).name == "Базовый"
    assert get_tier(9999, standard_rules).name == "Базовый"

    # Silver Tier
    assert get_tier(10000, standard_rules).name == "Серебро"
    assert get_tier(49999, standard_rules).name == "Серебро"

    # Gold Tier
    assert get_tier(50000, standard_rules).name == "Золото"
    assert get_tier(99999, standard_rules).name == "Золото"

    # Platinum Tier
    assert get_tier(100000, standard_rules).name == "Платина"
    assert get_tier(1000000, standard_rules).name == "Платина"


def test_calc_earned_points_all_tiers(standard_rules):
    # Min amount check (standard rules say 100)
    assert calc_earned_points(99, 0, standard_rules) == 0

    # Base: 5%
    assert calc_earned_points(1000, 0, standard_rules) == 50
    assert calc_earned_points(1000, 9999, standard_rules) == 50

    # Silver: 7%
    assert calc_earned_points(1000, 10000, standard_rules) == 70

    # Gold: 10%
    assert calc_earned_points(1000, 50000, standard_rules) == 100

    # Platinum: 15%
    assert calc_earned_points(1000, 100000, standard_rules) == 150


def test_clamp_redeem_points_per_tier(standard_rules):
    # Total amount 1000

    # Base: max 30% (300 points)
    assert clamp_redeem_points(1000, 0, 500, 500, standard_rules) == 300

    # Silver: max 50% (500 points)
    assert clamp_redeem_points(1000, 10000, 600, 600, standard_rules) == 500

    # Gold: max 100%
    assert clamp_redeem_points(1000, 50000, 800, 1000, standard_rules) == 800
    assert clamp_redeem_points(1000, 50000, 1200, 2000, standard_rules) == 1000


def test_clamp_redeem_points_insufficient_available(standard_rules):
    # Tier Gold (100% allowed), but only 50 available
    assert clamp_redeem_points(1000, 50000, 100, 50, standard_rules) == 50


def test_clamp_redeem_points_negative_values(standard_rules):
    assert clamp_redeem_points(-100, 0, 10, 10, standard_rules) == 0
    assert clamp_redeem_points(100, 0, -10, 10, standard_rules) == 0
