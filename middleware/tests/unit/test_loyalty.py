from app.loyalty import LoyaltyRules, Tier, calc_earned_points, clamp_redeem_points


def test_calc_earned_points_min_threshold() -> None:
    rules = LoyaltyRules(
        min_amount_for_accrual=100,
        tiers=[
            Tier(name="Test", min_spent=0, accrual_percent=10, max_redeem_percent=50)
        ],
    )
    assert calc_earned_points(99, 0, rules) == 0
    assert calc_earned_points(100, 0, rules) == 10


def test_clamp_redeem_points_limits() -> None:
    rules = LoyaltyRules(
        min_amount_for_accrual=100,
        tiers=[
            Tier(name="Test", min_spent=0, accrual_percent=10, max_redeem_percent=50)
        ],
    )
    assert clamp_redeem_points(0, 0, 10, 100, rules) == 0
    assert clamp_redeem_points(200, 0, 0, 100, rules) == 0
    assert clamp_redeem_points(200, 0, 10, 0, rules) == 0

    assert clamp_redeem_points(200, 0, 999, 999, rules) == 100
    assert clamp_redeem_points(200, 0, 80, 50, rules) == 50
    assert clamp_redeem_points(200, 0, 80, 999, rules) == 80
