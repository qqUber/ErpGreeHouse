# Comprehensive Bug Fix and Schema Stabilization Plan

This plan addresses critical runtime errors from the code review and resolves the SQLite schema migration issues preventing local development without Docker.

---

## Phase 1: Critical Runtime Fixes (Must Fix Immediately)

### Issue 1.1: Missing Logger Definition (CRITICAL - Causes NameError)
**File:** `middleware/app/handlers.py`
**Problem:** The `logger = logging.getLogger(__name__)` import was removed, but `logger` is used throughout (lines 257, 368, etc.). This causes immediate `NameError` on startup.
**Fix:** Add back the logger definition at the top of the file after imports.

### Issue 1.2: Misplaced EMAIL_RE Constant
**File:** `middleware/app/handlers.py`
**Problem:** `EMAIL_RE` is defined between function definitions (line 82), violating Python conventions and making code hard to maintain.
**Fix:** Move to the top of the file with other constants (around line 20).

---

## Phase 2: Database Schema Analysis and Fix Strategy

### Root Cause Analysis of SQLite Error "no such column: country_id"

**Context:**
- Docker Desktop is unavailable, requiring direct SQLite fixes
- Error occurs even with `PRAGMA foreign_keys = OFF`
- New tables (countries, cities, locations) reference each other

**Identified Problems:**

#### Problem 2.1: Table Creation Order and Dependencies
**Current State:**
1. `cities` table has `country_id INTEGER NOT NULL DEFAULT 1` (line 532)
2. `locations` table has `city_id INTEGER NOT NULL` (line 548)
3. `product_inventory` has FK to products and locations (line 571-573)
4. `customer_visits` has FK to customers and locations (line 590-591)
5. `customer_product_preferences` has FK to customers and products (line 607-608)

**The Issue:** While `PRAGMA foreign_keys = OFF` prevents FK enforcement during INSERT, it doesn't prevent the schema from being created. However, the error "no such column: country_id" suggests:
- Either the migrations (ALTER TABLE at lines 664-667) are running before table creation
- Or the seeding function (`_seed_initial_countries_and_cities`) is being called before cities table fully exists
- Or there's a race condition between schema creation and migration

#### Problem 2.2: Migration Timing Issue
**Current Flow:**
```python
Line 622: PRAGMA foreign_keys = ON
Line 657-673: ALTER TABLE migrations for country_id, city_id, etc.
Line 676: _seed_initial_countries_and_cities()
```

**Risk:** The ALTER TABLE at lines 664-667 adds columns, but if the database was previously initialized without these migrations, they run fine. However, if we're creating fresh tables, the columns might already exist (defined in CREATE TABLE), causing "duplicate column name" errors that are silently caught.

#### Problem 2.3: cities Table Has NO Foreign Key Constraint
Looking at lines 530-538, the `cities` table definition:
```sql
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_id INTEGER NOT NULL DEFAULT 1,  -- NO FK CONSTRAINT!
    ...
);
```
**Observation:** There's no `FOREIGN KEY(country_id) REFERENCES countries(id)` constraint in the CREATE TABLE. This means the error "no such column: country_id" is NOT a FK issue - it's an actual missing column issue.

**Hypothesis:** The cities table already exists in the local database WITHOUT the country_id column (from a previous schema version), and the `CREATE TABLE IF NOT EXISTS` doesn't add it because the table already exists.

### The Real Fix Strategy

**Strategy 2.1: Defensive Column Migration**
For all new tables that might exist without new columns, we need proper migration detection:
1. Check if table exists
2. Check if column exists using `PRAGMA table_info(table_name)`
3. Only then run ALTER TABLE

**Strategy 2.2: Separate Schema Versions**
The current approach mixes CREATE TABLE and ALTER TABLE. We need a cleaner separation:
1. First, create ALL tables without FK constraints (reference columns as plain INTEGER)
2. Then, run all ALTER TABLE migrations to add missing columns
3. Finally, add FK constraints via separate ALTER TABLE statements (SQLite 3.8.2+)

**Strategy 2.3: Fix cities Table Specifically**
The cities table needs to ensure country_id exists:
```python
# Check cities table schema
cols = [r["name"] for r in conn.execute("PRAGMA table_info(cities)").fetchall()]
if "country_id" not in cols:
    conn.execute("ALTER TABLE cities ADD COLUMN country_id INTEGER NOT NULL DEFAULT 1")
```

---

## Phase 3: Secondary Code Review Fixes

### Issue 3.1: Cache Invalidation Mismatch
**File:** `middleware/app/services/location_service.py:336`
**Problem:** `record_customer_visit()` invalidates cache key `f"customer_visits:{customer_id}"`, but `get_locations_by_city()` doesn't use this cache pattern.
**Fix:** Either remove the invalidation or implement the cache in `get_locations_by_city()`.

### Issue 3.2: Price Type Conversion Inconsistency
**File:** `middleware/app/products_api.py:421-422`
**Problem:** Converts price from cents to float on read, but may break API contract.
**Fix:** Verify frontend expectations; add explicit type documentation.

### Issue 3.3: Widget Skeleton Test IDs
**File:** `admin-ui/src/components/ui/WidgetSkeleton.tsx`
**Observation:** Uses inline styles instead of CSS modules (pattern violation).
**Fix:** Create CSS module or add tech debt note.

---

## Phase 4: Implementation Order

1. **Immediate:** Fix handlers.py logger and EMAIL_RE
2. **High Priority:** Fix database schema migrations in db.py
   - Add defensive column existence checks
   - Separate FK constraint addition
3. **Medium Priority:** Fix cache invalidation mismatch
4. **Low Priority:** Widget styling improvements

---

## Testing Strategy

1. Test handlers.py imports: `python -c "from app.handlers import router"`
2. Test db initialization: `python -c "from app.db import init_db; init_db()"`
3. Verify all tables created with correct columns
4. Run unit tests (Docker-less): `pytest tests/unit/ -v`

---

## Risk Mitigation

- **Database Backup:** Before schema changes, backup local .db file
- **Rollback Plan:** If migrations fail, restore from backup and adjust migration logic
- **Docker Alternative:** Document local Python virtualenv setup as Docker alternative
