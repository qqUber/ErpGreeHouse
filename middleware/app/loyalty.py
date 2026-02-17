from dataclasses import dataclass


@dataclass(frozen=True)
class LoyaltyRules:
    accrual_percent: int = 10
    min_amount_for_accrual: int = 100
    max_redeem_percent: int = 50


def calc_earned_points(total_amount: int, rules: LoyaltyRules) -> int:
    if total_amount < rules.min_amount_for_accrual:
        return 0
    return (total_amount * rules.accrual_percent) // 100


def clamp_redeem_points(total_amount: int, requested_points: int, available_points: int, rules: LoyaltyRules) -> int:
    if total_amount <= 0:
        return 0
    if requested_points <= 0 or available_points <= 0:
        return 0
    max_allowed = (total_amount * rules.max_redeem_percent) // 100
    return max(0, min(requested_points, available_points, max_allowed))
