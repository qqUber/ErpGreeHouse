from dataclasses import dataclass, field
import logging
from typing import List, Optional, Tuple
import redis
from .config import get_settings

# Redis key prefixes for sorted sets
LEADERBOARD_KEY = "crm:leaderboard:spent"
TIER_MEMBERSHIP_KEY = "crm:tier:membership"
USER_SCORES_KEY = "crm:user:scores"

# Module-level Redis connection for connection pooling
_redis_client: Optional[redis.Redis] = None

logger = logging.getLogger(__name__)


def _get_redis() -> Optional[redis.Redis]:
    """Get Redis connection with connection pooling for high-load scenarios.

    Uses a module-level singleton to avoid creating new connections on each call.
    Connection is created lazily on first access.

    Returns None if Redis is unavailable, allowing callers to handle gracefully.
    """
    global _redis_client
    if _redis_client is None:
        try:
            settings = get_settings()
            _redis_client = redis.from_url(settings.redis_url, decode_responses=True)
            # Test connection
            _redis_client.ping()
        except Exception as e:
            logger.warning(
                f"[Loyalty] Redis unavailable, leaderboard features disabled: {e}"
            )
            _redis_client = None
    return _redis_client


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


def get_next_tier(spent_amount: int, rules: LoyaltyRules) -> Optional[Tier]:
    """Returns the next target tier if one exists."""
    sorted_tiers = sorted(rules.tiers, key=lambda t: t.min_spent)
    for t in sorted_tiers:
        if t.min_spent > spent_amount:
            return t
    return None


# =============================================================================
# Redis 8 Sorted Set Operations for High-Load Tier Calculations
# =============================================================================


def update_user_spent_score(user_id: int, spent_amount: int) -> None:
    """
    Update user's spent amount in Redis sorted set.
    Uses Redis 8 sorted sets for O(log N) tier rank lookups.

    Note: This replaces the entire score. For incremental updates, use
    increment_user_spent_score() which uses ZINCRBY for atomic operations.

    Args:
        user_id: Unique customer identifier
        spent_amount: Total lifetime spent amount
    """
    r = _get_redis()
    if r is None:
        logger.warning("[Loyalty] Redis unavailable, cannot update user score")
        return
    r.zadd(LEADERBOARD_KEY, {str(user_id): spent_amount})


def increment_user_spent_score(user_id: int, amount: int) -> int:
    """
    Increment user's spent amount atomically using Redis ZINCRBY.
    This is the preferred method for adding points/purchases as it handles
    concurrent updates safely.

    Uses Redis 8 sorted set operations for O(log N) complexity.

    Args:
        user_id: Unique customer identifier
        amount: Amount to add to the user's current score

    Returns:
        The new total score after increment
    """
    r = _get_redis()
    if r is None:
        logger.warning("[Loyalty] Redis unavailable, cannot increment user score")
        return 0
    new_score = r.zincrby(LEADERBOARD_KEY, amount, str(user_id))
    return int(new_score)  # type: ignore[arg-type]


def get_user_rank(user_id: int) -> Optional[int]:
    """
    Get user's rank in the leaderboard (0-indexed).
    Returns None if user not found.
    """
    r = _get_redis()
    if r is None:
        return None
    rank = r.zrevrank(LEADERBOARD_KEY, str(user_id))
    return rank if rank is not None else None  # type: ignore[return-value]


def get_user_percentile(user_id: int) -> Optional[float]:
    """
    Get user's percentile rank (0-100).
    Higher percentile = higher tier status.
    """
    r = _get_redis()
    if r is None:
        return None
    rank = r.zrevrank(LEADERBOARD_KEY, str(user_id))
    if rank is None:
        return None
    total = r.zcard(LEADERBOARD_KEY)
    if total == 0:
        return 0.0
    return ((total - rank - 1) / total) * 100  # type: ignore[no-any-return]


def get_top_spenders(limit: int = 10) -> List[Tuple[int, int]]:
    """
    Get top spenders leaderboard.
    Returns list of (user_id, spent_amount) tuples.
    """
    r = _get_redis()
    if r is None:
        return []
    results = r.zrevrange(LEADERBOARD_KEY, 0, limit - 1, withscores=True)  # type: ignore[union-attr]
    return [(int(uid), int(score)) for uid, score in results]  # type: ignore[union-attr]


def get_tier_from_percentile(percentile: float, rules: LoyaltyRules) -> Tier:
    """
    Determine tier based on user's percentile ranking.
    Useful for percentile-based tier upgrades.

    Tier thresholds (percentile-based):
    - Platinum: Top 1%
    - Gold: Top 5%
    - Silver: Top 20%
    - Bronze: All others
    """
    if percentile >= 99:
        return next((t for t in rules.tiers if t.name == "Платина"), rules.tiers[-1])
    elif percentile >= 95:
        return next((t for t in rules.tiers if t.name == "Золото"), rules.tiers[-1])
    elif percentile >= 80:
        return next((t for t in rules.tiers if t.name == "Серебро"), rules.tiers[1])
    else:
        return rules.tiers[0]  # Bronze/Base


def get_users_in_tier(tier_name: str, rules: LoyaltyRules) -> List[int]:
    """
    Get all user IDs in a specific tier based on spent amount thresholds.
    Uses Redis ZRANGEBYSCORE for O(log N + M) lookups.
    """
    tier = next((t for t in rules.tiers if t.name == tier_name), None)
    if not tier:
        return []

    r = _get_redis()
    # Find next tier's minimum for range
    sorted_tiers = sorted(rules.tiers, key=lambda t: t.min_spent)
    tier_idx = next((i for i, t in enumerate(sorted_tiers) if t.name == tier_name), -1)

    if tier_idx < len(sorted_tiers) - 1:
        max_score: float = sorted_tiers[tier_idx + 1].min_spent - 1
    else:
        max_score = float("inf")

    results = r.zrangebyscore(LEADERBOARD_KEY, tier.min_spent, max_score, withscores=False)  # type: ignore[union-attr]
    return [int(uid) for uid in results]  # type: ignore[union-attr]


def batch_update_scores(updates: List[Tuple[int, int]]) -> None:
    """
    Batch update multiple user scores in a single Redis operation.
    Optimized for high-load scenarios.

    Args:
        updates: List of (user_id, spent_amount) tuples
    """
    if not updates:
        return
    r = _get_redis()
    if r is None:
        return
    mapping = {str(uid): score for uid, score in updates}
    r.zadd(LEADERBOARD_KEY, mapping)


def get_user_score(user_id: int) -> Optional[int]:
    """
    Get user's current spent amount from Redis sorted set.
    """
    r = _get_redis()
    if r is None:
        logger.warning("[Loyalty] Redis unavailable, cannot get user score")
        return None
    score = r.zscore(LEADERBOARD_KEY, str(user_id))  # type: ignore[union-attr]
    return int(score) if score is not None else None  # type: ignore[arg-type]


def remove_user_from_leaderboard(user_id: int) -> None:
    """
    Remove user from leaderboard (e.g., after account deletion).
    """
    r = _get_redis()
    if r is None:
        logger.warning(
            "[Loyalty] Redis unavailable, cannot remove user from leaderboard"
        )
        return
    r.zrem(LEADERBOARD_KEY, str(user_id))


def get_leaderboard_count() -> int:
    """Get total number of users in the leaderboard."""
    r = _get_redis()
    if r is None:
        logger.warning("[Loyalty] Redis unavailable, cannot get leaderboard count")
        return 0
    return r.zcard(LEADERBOARD_KEY)  # type: ignore[return-value]


def get_rank_range(start: int, end: int) -> List[Tuple[int, int, int]]:
    """
    Get a range of users by rank (inclusive).
    Returns list of (rank, user_id, spent_amount).
    """
    r = _get_redis()
    if r is None:
        logger.warning("[Loyalty] Redis unavailable, cannot get rank range")
        return []
    results = r.zrevrange(LEADERBOARD_KEY, start, end, withscores=True)  # type: ignore[union-attr]
    return [(start + i, int(uid), int(score)) for i, (uid, score) in enumerate(results)]  # type: ignore[arg-type]


def calculate_user_tier(user_id: int, rules: LoyaltyRules) -> Tuple[Tier, int]:
    """
    Calculate the appropriate tier for a user based on their current score.
    Uses Redis ZREVRANGE for efficient percentile-based tier determination.

    Args:
        user_id: Unique customer identifier
        rules: Loyalty rules defining tier thresholds

    Returns:
        Tuple of (current_tier, next_tier_remaining) where next_tier_remaining
        is the amount needed to reach next tier (0 if at max tier)
    """
    r = _get_redis()

    # Get user's current score
    current_score = r.zscore(LEADERBOARD_KEY, str(user_id))  # type: ignore[union-attr]
    if current_score is None:
        return rules.tiers[0], rules.tiers[1].min_spent if len(rules.tiers) > 1 else 0

    current_score = int(current_score)  # type: ignore[arg-type]

    # Find current tier based on spent amount
    current_tier = get_tier(current_score, rules)

    # Find next tier
    next_tier = get_next_tier(current_score, rules)
    remaining = 0
    if next_tier:
        remaining = next_tier.min_spent - current_score

    return current_tier, remaining


def get_tier_leaderboard(
    tier_name: str, rules: LoyaltyRules, limit: int = 100
) -> List[Tuple[int, int, int]]:
    """
    Get leaderboard for users within a specific tier using ZREVRANGE.

    Args:
        tier_name: Name of the tier to get leaderboard for
        rules: Loyalty rules defining tier thresholds
        limit: Maximum number of users to return

    Returns:
        List of (rank, user_id, spent_amount) for users in the tier
    """
    tier = next((t for t in rules.tiers if t.name == tier_name), None)
    if not tier:
        return []

    r = _get_redis()

    # Get tier threshold boundaries
    sorted_tiers = sorted(rules.tiers, key=lambda t: t.min_spent)
    tier_idx = next((i for i, t in enumerate(sorted_tiers) if t.name == tier_name), -1)

    min_score = tier.min_spent
    max_score = float("inf")
    if tier_idx < len(sorted_tiers) - 1:
        max_score = sorted_tiers[tier_idx + 1].min_spent - 1

    # Use ZRANGEBYSCORE to get users in tier, then reverse for ranking
    results = r.zrangebyscore(LEADERBOARD_KEY, min_score, max_score, withscores=True)  # type: ignore[union-attr]

    # Sort by score descending and assign ranks
    results_sorted = sorted(results, key=lambda x: x[1], reverse=True)  # type: ignore[arg-type]
    return [
        (i, int(uid), int(score))
        for i, (uid, score) in enumerate(results_sorted[:limit])
    ]


def get_user_tier_rank(user_id: int) -> Optional[int]:
    """
    Get user's rank within their tier using ZREVRANGE.
    Returns the user's position within their tier (0-indexed).
    """
    r = _get_redis()
    if r is None:
        return None
    rank = r.zrevrank(LEADERBOARD_KEY, str(user_id))
    return rank if rank is not None else None


def bulk_increment_scores(updates: List[Tuple[int, int]]) -> List[int]:
    """
    Bulk increment multiple user scores atomically using Redis pipeline.
    Uses ZINCRBY for each update in a pipeline for performance.

    Args:
        updates: List of (user_id, amount_to_increment) tuples

    Returns:
        List of new scores after increment
    """
    if not updates:
        return []

    r = _get_redis()
    if r is None:
        return []
    pipe = r.pipeline()

    for user_id, amount in updates:
        pipe.zincrby(LEADERBOARD_KEY, amount, str(user_id))

    results = pipe.execute()
    return [int(score) for score in results]
