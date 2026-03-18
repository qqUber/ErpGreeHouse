import pytest

from app.loyalty import LoyaltyRules, Tier, get_next_tier


@pytest.fixture
def standard_rules():
    return LoyaltyRules()


def test_get_next_tier_logic(standard_rules):
    # Current: Base (0-9999), Next: Silver (10000)
    nt = get_next_tier(0, standard_rules)
    assert nt.name == "Серебро"
    assert nt.min_spent == 10000

    nt = get_next_tier(5000, standard_rules)
    assert nt.name == "Серебро"

    # Current: Silver (10000), Next: Gold (50000)
    nt = get_next_tier(10000, standard_rules)
    assert nt.name == "Золото"
    assert nt.min_spent == 50000

    # Current: Gold (50000), Next: Platinum (100000)
    nt = get_next_tier(50000, standard_rules)
    assert nt.name == "Платина"

    # Current: Platinum (100000), Next: None
    nt = get_next_tier(100000, standard_rules)
    assert nt is None

    nt = get_next_tier(1000000, standard_rules)
    assert nt is None


def test_get_next_tier_custom_rules():
    rules = LoyaltyRules(
        tiers=[
            Tier(name="A", min_spent=0, accrual_percent=1, max_redeem_percent=10),
            Tier(name="B", min_spent=100, accrual_percent=2, max_redeem_percent=20),
        ]
    )
    assert get_next_tier(50, rules).name == "B"
    assert get_next_tier(150, rules) is None
