# Password Recovery Analysis Report

## Executive Summary

The password recovery functionality is implemented in [`middleware/app/admin_auth_api.py:recover_password()`](middleware/app/admin_auth_api.py:636). **The core functionality is working correctly**, but there is no separate `recovery.py` file as mentioned in the task - the recovery logic is embedded in the admin_auth_api module.

This report details what is implemented, what is missing/can be improved, and provides detailed fix recommendations.

---

## Current Implementation

### Location
- **File**: `middleware/app/admin_auth_api.py`
- **Function**: `recover_password()` (lines 636-666)
- **Endpoint**: `POST /api/v1/public/auth/recover`

### Code Flow

```python
@public_router.post("/recover")
def recover_password(
    request: Request,
    payload: RecoverIn,
    x_admin_recovery: str | None = Header(default=None, alias="x-admin-recovery"),
) -> dict[str, Any]:
    # 1. Validate recovery secret
    expected = os.getenv("ADMIN_RECOVERY_SECRET", "")
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_RECOVERY_SECRET not configured")
    if not x_admin_recovery or not constant_time_equals(x_admin_recovery, expected):
        raise HTTPException(status_code=401, detail="Invalid recovery secret")

    # 2. Find user
    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute("SELECT id FROM admin_users WHERE username=?", (payload.username.strip(),)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        # 3. Generate new password hash
        salt = new_salt()
        iterations = int(os.getenv("ADMIN_PBKDF2_ITER", "200000"))
        new_hash = hash_password(payload.new_password, salt=salt, iterations=iterations)

        # 4. Update password
        conn.execute(
            "UPDATE admin_users SET password_hash=?, password_salt=?, password_iter=?, must_change_password=0, updated_at=datetime('now') WHERE id=?",
            (new_hash, salt, iterations, int(row["id"])),
        )

        # 5. Invalidate all existing tokens
        conn.execute("DELETE FROM admin_tokens WHERE admin_user_id=?", (int(row["id"]),))
        conn.commit()
        return {"recovered": True}
    finally:
        conn.close()
```

---

## What's Working ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Recovery secret validation | ✅ Working | Uses constant-time comparison |
| Password hashing | ✅ Working | PBKDF2 with configurable iterations |
| User lookup | ✅ Working | Searches by username |
| Password update | ✅ Working | Updates hash, salt, iteration count |
| Token invalidation | ✅ Working | Deletes all existing admin_tokens |
| Must-change-password reset | ✅ Working | Sets `must_change_password=0` |

---

## What's Missing or Needs Improvement ⚠️

### 1. No Separate Recovery Module

**Current State**: Recovery logic is embedded in `admin_auth_api.py`
**Expected**: `middleware/app/auth/recovery.py` (as mentioned in task)

**Impact**: None - the implementation works correctly. This is just a code organization preference.

---

### 2. No Audit Logging

**Current State**: No logging of password recovery events
**Expected**: Log who performed the reset, when, and from where

**Impact**: Security - no traceability for compliance

**Fix Recommendation**:
```python
import logging
logger = logging.getLogger(__name__)

# Add to recover_password function:
logger.info(f"Password recovery initiated for user '{payload.username}' by admin")
# After successful recovery:
logger.info(f"Password successfully reset for user '{payload.username}'")
```

---

### 3. No User Notification

**Current State**: User is not notified when their password is reset
**Expected**: Send email/SMS/push notification to user

**Impact**: User may be unaware their password was changed (security risk)

**Fix Recommendation**:
```python
# Add notification after successful password reset
async def notify_password_reset(username: str, email: str):
    """Send notification to user about password reset."""
    # Implementation depends on notification system (email, telegram, etc.)
    pass
```

---

### 4. No Rate Limiting

**Current State**: No protection against brute-force attacks on recovery endpoint
**Expected**: Rate limit the recovery attempts

**Impact**: Potential for brute-force attacks

**Fix Recommendation**:
- Implement per-IP rate limiting (e.g., 5 attempts per hour)
- Add CAPTCHA requirement after failed attempts
- Use FastAPI's built-in rate limiting or middleware

---

### 5. Recovery Secret vs Admin Secret Not Differentiated

**Current State**: Both use similar validation pattern
**Issue**: If someone obtains `ADMIN_SECRET`, they can also reset passwords

**Fix Recommendation**: Ensure `ADMIN_RECOVERY_SECRET` is:
- Different from `ADMIN_SECRET`
- Longer (minimum 32 characters)
- Rotated separately
- Stored in different secret management system if possible

---

### 6. No Multi-Factor Recovery

**Current State**: Single-factor (just recovery secret)
**Expected**: Additional verification (email link, SMS code)

**Impact**: Lower security for enterprise use

**Fix Recommendation** (Phase 2):
- Add email-based token verification
- Add optional SMS/Telegram verification
- Add recovery codes (like Google Authenticator)

---

## Detailed Fix Recommendations

### Priority 1: Critical Security Fixes

#### 1.1 Add Audit Logging

```python
# In middleware/app/admin_auth_api.py, add:
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

@public_router.post("/recover")
def recover_password(
    request: Request,
    payload: RecoverIn,
    x_admin_recovery: str | None = Header(default=None, alias="x-admin-recovery"),
) -> dict[str, Any]:
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    expected = os.getenv("ADMIN_RECOVERY_SECRET", "")
    if not expected:
        logger.critical("Password recovery attempted but ADMIN_RECOVERY_SECRET not configured")
        raise HTTPException(status_code=500, detail="ADMIN_RECOVERY_SECRET not configured")
    
    if not x_admin_recovery or not constant_time_equals(x_admin_recovery, expected):
        logger.warning(f"Invalid recovery secret attempt from {client_ip} for user '{payload.username}'")
        raise HTTPException(status_code=401, detail="Invalid recovery secret")

    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute("SELECT id FROM admin_users WHERE username=?", (payload.username.strip(),)).fetchone()
        if not row:
            logger.warning(f"Password recovery for non-existent user '{payload.username}' from {client_ip}")
            raise HTTPException(status_code=404, detail="User not found")

        # ... existing password update logic ...

        # Log successful recovery
        logger.info(f"Password reset successful for user '{payload.username}' from IP {client_ip}, User-Agent: {user_agent}")
        
        conn.commit()
        return {"recovered": True}
    finally:
        conn.close()
```

### Priority 2: Enhanced Security

#### 1.2 Add Rate Limiting

```python
# Add to middleware/app/main.py or use FastAPI dependencies
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@public_router.post("/recover")
@limiter.limit("5/minute")  # 5 attempts per minute
def recover_password(request: Request, ...):
    # ... existing logic ...
```

#### 1.3 Environment Validation

Ensure proper environment setup:
```bash
# .env file (DO NOT COMMIT)
ADMIN_RECOVERY_SECRET=your-unique-32-char-minimum-secret-here
ADMIN_SECRET=different-secret-here
```

### Priority 3: User Experience

#### 1.4 Add User Notification

```python
async def send_password_reset_notification(username: str, email: str):
    """Send notification to user after password reset."""
    # Telegram notification
    from .bot import send_message
    
    message = f"🔐 Your password has been reset by an administrator.\nIf you did not request this, please contact support immediately."
    
    db = get_db()
    conn = db.connect()
    try:
        tg_user = conn.execute(
            "SELECT telegram_id FROM telegram_users WHERE username=?", (username,)
        ).fetchone()
        if tg_user and tg_user["telegram_id"]:
            await send_message(int(tg_user["telegram_id"]), message)
    finally:
        conn.close()
```

---

## Testing Checklist

To verify password recovery works correctly:

| Test | Expected Result |
|------|------------------|
| Valid recovery secret + valid user | `{"recovered": true}` |
| Invalid recovery secret | 401 Unauthorized |
| Missing recovery secret | 401 Unauthorized |
| Non-existent user | 404 Not Found |
| Valid recovery + token exists | Token deleted after recovery |
| Multiple rapid requests | Rate limited after threshold |

---

## Configuration Checklist

Ensure these environment variables are set:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_RECOVERY_SECRET` | Yes | - | Secret for password recovery |
| `ADMIN_SECRET` | No | - | Admin backdoor secret (dev only) |
| `ADMIN_PBKDF2_ITER` | No | 200000 | Password hashing iterations |

---

## Conclusion

The password recovery implementation is **functional but lacks enterprise-grade features**. The core security (constant-time comparison, password hashing, token invalidation) is correctly implemented.

**Recommended Actions**:
1. ✅ Add audit logging (Priority 1)
2. ⚠️ Add rate limiting (Priority 2)
3. ⚠️ Add user notifications (Priority 3)
4. ⚠️ Consider multi-factor recovery for production (Future)

The implementation does NOT have critical bugs - it's simply missing logging, notifications, and rate limiting which are recommended for production use.
