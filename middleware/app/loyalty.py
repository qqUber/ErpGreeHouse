from dataclasses import dataclass, field
from typing import List


@dataclass(frozen=True)
class Tier:
    name: str
    min_spent: int
    accrual_percent: int
    max_redeem_percent: int


@dataclass(frozen=True)
class LoyaltyRules:
    min_amount_for_accrual: int = 100
    tiers: List[Tier] = field(
        default_factory=lambda: [
            Tier(name="Базовый", min_spent=0, accrual_percent=5, max_redeem_percent=30),
            Tier(
                name="Серебро",
                min_spent=10000,
                accrual_percent=7,
                max_redeem_percent=50,
            ),
            Tier(
                name="Золото",
                min_spent=50000,
                accrual_percent=10,
                max_redeem_percent=100,
            ),
            Tier(
                name="Платина",
                min_spent=100000,
                accrual_percent=15,
                max_redeem_percent=100,
            ),
        ]
    )


def get_tier(spent_amount: int, rules: LoyaltyRules) -> Tier:
    """Returns the correct tier based on historical spent amount."""
    current_tier = rules.tiers[0]
    for tier in sorted(rules.tiers, key=lambda t: t.min_spent):
        if spent_amount >= tier.min_spent:
            current_tier = tier
    return current_tier


def calc_earned_points(
    total_amount: int, spent_amount: int, rules: LoyaltyRules
) -> int:
    """Calculates earned points using the dynamic tier accrual percent."""
    if total_amount < rules.min_amount_for_accrual:
        return 0
    tier = get_tier(spent_amount, rules)
    return (total_amount * tier.accrual_percent) // 100


def clamp_redeem_points(
    total_amount: int,
    spent_amount: int,
    requested_points: int,
    available_points: int,
    rules: LoyaltyRules,
) -> int:
    """Clamps points mapping them directly to maximum percent allowed per Tier."""
    if total_amount <= 0:
        return 0
    if requested_points <= 0 or available_points <= 0:
        return 0

    tier = get_tier(spent_amount, rules)
    max_allowed = (total_amount * tier.max_redeem_percent) // 100
    return max(0, min(requested_points, available_points, max_allowed))


def get_next_tier(spent_amount: int, rules: LoyaltyRules) -> Tier | None:
    """Returns the next target tier if one exists."""
    sorted_tiers = sorted(rules.tiers, key=lambda t: t.min_spent)
    for t in sorted_tiers:
        if t.min_spent > spent_amount:
            return t
    return None
