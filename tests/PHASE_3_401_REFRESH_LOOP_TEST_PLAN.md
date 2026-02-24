# PHASE 3: 401/Refresh Loop Fix Verification Test Plan

## Executive Summary

This test plan validates the fix for the 401/refresh loop issue in the authentication system. The plan includes comprehensive verification of process cleanup, cache clearing, manual authentication testing, and edge case scenarios.

## 1. Pre-Test Environment Setup

### 1.1 Process Cleanup Commands

**Objective:** Ensure clean slate by terminating all running processes that could interfere with testing.

```bash
# Kill all processes on ports 8000 and 5173
# Port 8000: Middleware/API server
# Port 5173: Potential development server or test instance

# Windows PowerShell (Admin)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force -ErrorAction SilentlyContinue
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -Force -ErrorAction SilentlyContinue

# Alternative: Using netstat and taskkill
netstat -ano | findstr ":8000" | findstr "LISTENING" | foreach { taskkill /PID $_.Split("`t")[1] /F }
netstat -ano | findstr ":5173" | findstr "LISTENING" | foreach { taskkill /PID $_.Split("`t")[1] /F }

# Linux/Mac (if needed)
kill -9 $(lsof -t -i:8000)
kill -9 $(lsof -t -i:5173)
```

### 1.2 Cache Clearing Procedures

**Objective:** Clear all Redis/Memurai cache to ensure clean authentication state.

```bash
# Clear Redis cache (used for session management and rate limiting)
# Method 1: Using redis-cli
redis-cli -h localhost -p 6379 FLUSHALL

# Method 2: Using Python script (from middleware directory)
python middleware/flush_redis.py

# Method 3: Direct Redis command
redis-cli FLUSHALL

# Clear Memurai cache (if used as Redis alternative)
memurai-cli FLUSHALL

# Clear database session tokens
# This ensures no stale tokens exist in the database
python middleware/flush_redis.py --clear-tokens
```

### 1.3 Database Cleanup

**Objective:** Reset authentication state in the database.

```bash
# Clear admin tokens table
python -c "
import sqlite3
conn = sqlite3.connect('crm.db')
conn.execute('DELETE FROM admin_tokens')
conn.commit()
conn.close()
print('Admin tokens cleared')
"

# Reset admin users (optional - for clean test environment)
python middleware/reset_admin_password.py
```

## 2. Manual Authentication Testing

### 2.1 Login Test Script

**Objective:** Verify basic authentication flow works correctly.

```bash
# Test 1: Basic Login Flow
curl -X POST http://localhost:8000/api/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }' \
  -c cookies.txt \
  -v

# Expected Results:
# - HTTP 200 OK
# - Set access_token and refresh_token cookies
# - Response contains token, access_token, refresh_token
# - Must_change_password: false (if default admin)

# Test 2: Invalid Credentials
curl -X POST http://localhost:8000/api/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrongpassword"
  }' \
  -v

# Expected Results:
# - HTTP 401 Unauthorized
# - Detail: "Invalid credentials"

# Test 3: Missing Credentials
curl -X POST http://localhost:8000/api/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin"
  }' \
  -v

# Expected Results:
# - HTTP 422 Unprocessable Entity
# - Validation error for missing password
```

### 2.2 Refresh Token Test Script

**Objective:** Verify the /refresh endpoint works correctly and prevents infinite loops.

```bash
# Test 1: Valid Refresh Token
# First login to get valid tokens
curl -X POST http://localhost:8000/api/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }' \
  -c cookies.txt -b cookies.txt \
  -v

# Extract refresh token from response (manual step)
echo "Login successful. Now testing refresh..."

# Test refresh with valid token
sleep 1
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -b cookies.txt \
  -v

# Expected Results:
# - HTTP 200 OK
# - New access_token and refresh_token in response
# - New cookies set in response headers
# - Token type: "bearer"

# Test 2: Expired Access Token (should auto-refresh)
# Wait for access token to expire (or manipulate time)
sleep 2
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b cookies.txt \
  -v

# Expected Results:
# - HTTP 200 OK (if refresh worked)
# - Should return user info with fresh tokens

# Test 3: Invalid Refresh Token
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "invalid-token"
  }' \
  -v

# Expected Results:
# - HTTP 401 Unauthorized
# - Detail: "Invalid or expired refresh token"
# - Cookies cleared in response
```

### 2.3 Protected Endpoint Test

**Objective:** Verify protected endpoints require valid authentication.

```bash
# Test 1: Access protected endpoint with valid token
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b cookies.txt \
  -v

# Expected Results:
# - HTTP 200 OK
# - Returns user info (user_id, username, role, permissions)

# Test 2: Access protected endpoint without token
curl -X GET http://localhost:8000/api/v1/auth/me \
  -v

# Expected Results:
# - HTTP 401 Unauthorized
# - Detail: "Unauthorized"

# Test 3: Access with expired token
# First, manually clear cookies
curl -X GET http://localhost:8000/api/v1/auth/me \
  -b <(echo "access_token=expired.token.here; Path=/") \
  -v

# Expected Results:
# - HTTP 401 Unauthorized
# - Should trigger refresh attempt if refresh token available
```

## 3. Edge Case Testing

### 3.1 Token Expiration Scenarios

```bash
# Test 1: Access Token Expiration (within refresh window)
# Simulate access token expiration while refresh token is valid
# This should trigger automatic refresh

# Test 2: Refresh Token Expiration
# Both tokens expired - should require re-login

# Test 3: Token Manipulation
# Tamper with token claims - should be rejected
```

### 3.2 Concurrent Requests

```bash
# Test 1: Multiple simultaneous requests with same refresh token
# Should handle concurrency without race conditions

# Test 2: Parallel refresh attempts
# Should serialize refresh operations to prevent token conflicts
```

### 3.3 Cookie Handling

```bash
# Test 1: Cookie deletion mid-session
# Delete cookies and verify proper re-authentication

# Test 2: Cookie corruption
# Modify cookie values - should be rejected

# Test 3: Cross-site cookie access
# Verify httpOnly and secure flags work correctly
```

## 4. Automated Test Scripts

### 4.1 Comprehensive Test Script

```bash
#!/bin/bash
# comprehensive_auth_test.sh

echo "=== 401/Refresh Loop Fix Verification Test ==="
echo "1. Cleaning up environment..."

# Kill processes
kill $(lsof -t -i:8000) 2>/dev/null
kill $(lsof -t -i:5173) 2>/dev/null

# Clear Redis
echo "Clearing Redis cache..."
redis-cli FLUSHALL

# Clear database tokens
echo "Clearing database tokens..."
python -c "
import sqlite3
conn = sqlite3.connect('crm.db')
conn.execute('DELETE FROM admin_tokens')
conn.commit()
conn.close()
print('Database tokens cleared')
"

# Test 1: Basic Login
echo "
=== Test 1: Basic Login ==="
response=$(curl -s -X POST http://localhost:8000/api/v1/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }')

status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null || echo "error")

if [ "$status" = "error" ]; then
    echo "✓ Login successful"
    echo "Response: $response"
    
    # Extract tokens for next tests
    access_token=$(echo "$response" | jq -r '.access_token // empty')
    refresh_token=$(echo "$response" | jq -r '.refresh_token // empty')
    
    if [ -n "$access_token" ] && [ -n "$refresh_token" ]; then
        echo "✓ Tokens extracted successfully"
    else
        echo "✗ Failed to extract tokens"
        exit 1
    fi
else
    echo "✗ Login failed: $response"
    exit 1
fi

# Test 2: Refresh Token
echo "
=== Test 2: Refresh Token ==="
response=$(curl -s -X POST http://localhost:8000/api/v1/auth/refresh \
  -b <(echo "access_token=$access_token; refresh_token=$refresh_token; Path=/"))

status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null || echo "error")

if [ "$status" = "error" ]; then
    echo "✓ Refresh successful"
    echo "Response: $response"
    
    # Verify new tokens
    new_access=$(echo "$response" | jq -r '.access_token // empty')
    new_refresh=$(echo "$response" | jq -r '.refresh_token // empty')
    
    if [ -n "$new_access" ] && [ -n "$new_refresh" ]; then
        echo "✓ New tokens generated"
    else
        echo "✗ Failed to generate new tokens"
        exit 1
    fi
else
    echo "✗ Refresh failed: $response"
    exit 1
fi

# Test 3: Protected Endpoint
echo "
=== Test 3: Protected Endpoint ==="
response=$(curl -s -X GET http://localhost:8000/api/v1/auth/me \
  -b <(echo "access_token=$new_access; Path=/"))

status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null || echo "error")

if [ "$status" = "error" ]; then
    echo "✓ Protected endpoint accessible"
    echo "Response: $response"
else
    echo "✗ Protected endpoint failed: $response"
    exit 1
fi

echo "
=== All tests passed! ==="
```

## 5. Expected Results and Success Criteria

### 5.1 Success Criteria

1. **Process Cleanup:** All processes on ports 8000 and 5173 terminated successfully
2. **Cache Clearing:** Redis cache completely cleared, no stale data remains
3. **Authentication Flow:** 
   - Login returns HTTP 200 with valid tokens
   - Refresh endpoint returns HTTP 200 with new tokens
   - Protected endpoints return HTTP 200 with valid authentication
4. **Error Handling:** 
   - Invalid credentials return HTTP 401
   - Expired tokens trigger proper refresh flow
   - Malformed requests return appropriate HTTP 4xx errors
5. **Security:** 
   - Cookies are httpOnly and secure
   - Tokens are properly validated and rejected if tampered
   - No infinite redirect loops occur

### 5.2 Expected HTTP Status Codes

| Scenario | Expected Status | Reason |
|----------|----------------|---------|
| Successful login | 200 OK | Valid credentials |
| Invalid credentials | 401 Unauthorized | Authentication failed |
| Successful refresh | 200 OK | Valid refresh token |
| Invalid refresh token | 401 Unauthorized | Token validation failed |
| Protected endpoint (valid) | 200 OK | Authentication successful |
| Protected endpoint (no token) | 401 Unauthorized | Missing authentication |
| Protected endpoint (expired) | 401 Unauthorized | Token expired |

## 6. Monitoring and Logging

### 6.1 Log Verification

```bash
# Check middleware logs for authentication events
tail -f middleware/logs/auth.log 2>/dev/null || echo "No auth log found"

# Check Redis for session data
redis-cli -h localhost -p 6379 KEYS "*"

# Check database for tokens
sqlite3 crm.db "SELECT * FROM admin_tokens;"
```

### 6.2 Performance Metrics

- **Response Time:** Authentication endpoints should respond within 200ms
- **Token Generation:** JWT tokens should be generated within 50ms
- **Refresh Latency:** Refresh operations should complete within 100ms

## 7. Rollback Procedures

### 7.1 If Tests Fail

1. **Immediate Actions:**
   - Restart all services
   - Clear all caches
   - Restore from backup if necessary

2. **Debugging Steps:**
   - Check middleware logs for errors
   - Verify Redis connectivity
   - Test database connectivity
   - Validate JWT secret configuration

3. **Recovery:**
   - Restore previous working configuration
   - Reapply fix with additional logging
   - Re-run tests with verbose output

## 8. Test Environment Requirements

### 8.1 Software Dependencies

- Python 3.8+
- Redis 6.0+
- SQLite 3.31+
- curl 7.68+
- jq 1.6+ (for JSON parsing)

### 8.2 Configuration Requirements

```bash
# Environment variables required
export ADMIN_SECRET="your-secret-key"
export JWT_SECRET_KEY="your-jwt-secret"
export REDIS_URL="redis://localhost:6379/0"
export DATABASE_URL="sqlite:///crm.db"
```

## 9. Test Execution Schedule

### 9.1 Test Phases

1. **Phase 1:** Environment cleanup and setup (5 minutes)
2. **Phase 2:** Basic authentication tests (10 minutes)
3. **Phase 3:** Refresh token validation (10 minutes)
4. **Phase 4:** Edge case testing (15 minutes)
5. **Phase 5:** Performance and security validation (10 minutes)

### 9.2 Success Criteria Timeline

- **Immediate:** All basic tests pass (30 minutes)
- **Short-term:** Edge cases validated (45 minutes)
- **Long-term:** Performance benchmarks established (1 hour)

## 10. Documentation and Reporting

### 10.1 Test Results Format

```markdown
# 401/Refresh Loop Fix Verification Report

## Summary
- **Test Date:** [Date]
- **Environment:** [Dev/Staging/Prod]
- **Status:** [Pass/Fail/Partial]
- **Duration:** [Time]

## Detailed Results

### Process Cleanup
- [ ] All processes terminated
- [ ] Ports cleared

### Cache Clearing
- [ ] Redis cleared
- [ ] Database tokens cleared

### Authentication Tests
- [ ] Login successful
- [ ] Refresh successful
- [ ] Protected endpoints accessible

### Error Handling
- [ ] Invalid credentials handled
- [ ] Expired tokens handled
- [ ] Malformed requests handled

### Security
- [ ] Cookies secure
- [ ] Tokens validated
- [ ] No infinite loops

## Issues Found
- [List any issues with severity levels]

## Recommendations
- [Action items for improvements]
```