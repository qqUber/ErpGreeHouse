"""Business constants and configuration defaults for the ERP system.

This module contains hardcoded business rules that should be configurable
but are centralized here for easier maintenance.
"""

# =============================================================================
# TIME-BASED BUSINESS RULES
# =============================================================================

# Customer loyalty: days of inactivity before points expire
INACTIVE_POINTS_EXPIRY_DAYS = 180

# Recommendation engine: days to look back for recent purchases
RECENT_PURCHASE_WINDOW_DAYS = 7

# Marketing: daily push cooldown in seconds (24 hours)
DAILY_PUSH_COOLDOWN_SECONDS = 86400

# Cache TTLs
CACHE_TTL_SHORT_SECONDS = 60  # 1 minute for dynamic recommendations
CACHE_TTL_LONG_SECONDS = 3600  # 1 hour for preference data

# =============================================================================
# RECOMMENDATION ENGINE PARAMETERS
# =============================================================================

# Score decay factor for preference updates (0.0-1.0)
# Higher values preserve historical preferences longer
RECOMMENDATION_SCORE_DECAY = 0.9

# Default recommendation limits
DEFAULT_RECOMMENDATIONS_LIMIT = 3
MAX_RECOMMENDATIONS_LIMIT = 10

# Customer analysis limits
MAX_TRANSACTION_HISTORY = 50
TOP_PRODUCTS_COUNT = 10
TOP_CATEGORIES_COUNT = 5
PREFERRED_CATEGORIES_COUNT = 3

# Daily push eligibility
DAILY_PUSH_CUSTOMERS_LIMIT = 100

# =============================================================================
# PAGINATION DEFAULTS
# =============================================================================

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
ADMIN_MAX_PAGE_SIZE = 1000  # Admin endpoints can request more

# Location service
DEFAULT_FREQUENT_LOCATIONS_LIMIT = 5

# Inventory / Products
DEFAULT_LOW_STOCK_LIMIT = 20
DEFAULT_LOCATIONS_PAGE_SIZE = 15

# =============================================================================
# HTTP / NETWORK TIMEOUTS
# =============================================================================

# Default timeout for external HTTP requests (seconds)
DEFAULT_HTTP_TIMEOUT_SECONDS = 30.0

# =============================================================================
# TIME CONVERSION FACTORS
# =============================================================================

SECONDS_PER_HOUR = 3600
SECONDS_PER_DAY = 86400

# =============================================================================
# CELERY BEAT SCHEDULE (seconds)
# =============================================================================

# How often to run point expiration check
EXPIRE_INACTIVE_POINTS_INTERVAL = 86400  # Daily

# How often to process periodic marketing
PROCESS_MARKETING_INTERVAL = 3600  # Hourly
