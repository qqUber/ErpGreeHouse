# Phase 2: Loyalty Program Management

## Summary

This phase focuses on verifying and enhancing the existing loyalty program functionality. The loyalty program is already well-implemented with core features including:

- Points calculation and redemption
- Tier management
- Redis-based leaderboard
- TMA API endpoints
- POS integration API

## Plans Created

### 02-01: Verify Core Functionality
- Runs existing loyalty core tests
- Verifies calc_earned_points, clamp_redeem_points, get_tier, get_next_tier
- Ensures LoyaltyRules and Tier dataclass behavior

### 02-02: Enhance Test Coverage
- Creates tests for Redis-based operations
- Creates tests for TMA API endpoints
- Creates tests for integrations API (POS receipt processing)
- Creates tests for advanced loyalty scenarios
- Improves overall test coverage

### 02-03: Add Missing Features
- Implements loyalty points expiration logic
- Adds tier expiration and renewal
- Enhances loyalty rules configuration
- Improves error handling and logging

### 02-04: Verify Cross-Channel Functionality
- Tests TMA API integration
- Tests POS integration API
- Tests admin dashboard integration
- Verifies Redis leaderboard functionality
- Ensures consistency across all channels

## Existing Functionality

### Core Loyalty Logic (loyalty.py)
- **calc_earned_points**: Calculates earned points based on tier
- **clamp_redeem_points**: Clamps points redemption to tier limits
- **get_tier**: Determines user's tier based on spent amount
- **get_next_tier**: Returns next tier if available
- **LoyaltyRules**: Default rules with 4 tiers (Базовый, Серебро, Золото, Платина)

### Redis Operations
- Leaderboard management using Redis sorted sets
- Rank and percentile calculations
- Tier-based leaderboards
- Batch operations for high load scenarios

### API Endpoints

#### TMA API (tma_api.py)
- `/api/v1/tma/me`: Returns user info, balance, tier, QR token

#### Integrations API (integrations_api.py)
- `/api/v1/public/integrations/{id}/pos/receipt`: Ingests POS receipts with loyalty processing

### Current Test Coverage
- **test_loyalty_core.py**: Comprehensive tests for core functionality
- **test_loyalty_advanced.py**: Advanced scenarios and boundary conditions
- **test_loyalty_next_tier.py**: Next tier calculation tests
- **test_loyalty.py**: Basic functionality tests

## Next Steps

1. Execute plan 02-01 to verify existing core functionality
2. Execute plan 02-02 to enhance test coverage
3. Execute plan 02-03 to add missing features
4. Execute plan 02-04 to verify cross-channel functionality

All plans are designed to ensure the loyalty program works correctly across all channels and is well-tested for future maintenance.
