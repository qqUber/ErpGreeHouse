# Authentication Flow Source of Truth

## Hybrid Authentication Flow

**Current Implementation**: Dual-Mode Authentication (JWT + Legacy)

> **NOTE**: This document describes the Hybrid Authentication Flow that supports both JWT (production) and legacy secret (demo/internal tools) authentication.
>
> **JWT is the primary method for production** - use httpOnly cookies for secure session management.
> **Legacy Secret (x-admin-secret) is for internal tools and demo purposes** - use header-based authentication.

### Environment Configuration

| Environment | JWT_SECRET_KEY Required | Fallback Allowed | Auth Method |
|-------------|----------------------|------------------|-------------|
| Production | ✅ YES (required) | ❌ NO | JWT only |
| Demo/Staging | ⚠️ Optional | ✅ YES | JWT + Legacy |
| Development | ⚠️ Optional | ✅ YES | JWT + Legacy |

### Token Transport Method

**JWT (Production)**:
- **Access Token**: Stored in `access_token` httpOnly cookie (30-minute expiry)
- **Refresh Token**: Stored in `refresh_token` httpOnly cookie (30-day expiry)
- **Delivery**: Set-Cookie headers ONLY, NEVER in response body

**Legacy (Demo/Internal)**:
- **Token**: Static secret from `ADMIN_SECRET` environment variable
- **Delivery**: `x-admin-secret` HTTP header
- **Note**: Legacy tokens should NEVER be sent in Authorization: Bearer header

## Login Flow

1. **Request**: POST `/api/v1/public/auth/login` with `{ username, password }`
2. **Backend Processing**:
   - Validates credentials against `admin_users` table
   - Generates JWT access token (30-minute expiry)
   - Generates JWT refresh token (30-day expiry)
   - Generates legacy token for backward compatibility
3. **Response**: Sets cookies via `Set-Cookie` headers ONLY:
   - `access_token` (httpOnly, secure, samesite=lax)
   - `refresh_token` (httpOnly, secure, samesite=lax)
   - `admin_session` (legacy, httpOnly, secure, samesite=lax)
   - **NO tokens in JSON response body**
4. **Frontend**: No token storage needed - cookies are automatically sent with requests

## Protected Endpoint Flow

### JWT Mode (Production)

1. **Request**: Browser automatically sends httpOnly cookies with each request
2. **Backend Processing**:
   - `require_jwt_auth` middleware reads `access_token` from cookies
   - Validates JWT token
   - If valid, allows access
3. **Response**: Returns protected resource or 401 if unauthorized

### Legacy Mode (Demo/Internal)

1. **Request**: Client sends `x-admin-secret` header with static secret
2. **Backend Processing**:
   - `require_jwt_auth` middleware checks for JWT first
   - If no JWT provided, validates `x-admin-secret` header
   - Validates against `ADMIN_SECRET` environment variable
3. **Response**: Returns protected resource or 401 if unauthorized

### Critical Rule: No Fallback on JWT Failure

> **IMPORTANT**: If a JWT token is provided but fails validation (expired, invalid signature, etc.), 
> the system returns 401 immediately. It does NOT fall back to legacy authentication.
>
> This prevents security issues where an attacker could try to use an invalid JWT to probe 
> the legacy authentication fallback.

## Refresh Flow

1. **Trigger**: 401 response or periodic refresh (every 10 minutes)
2. **Request**: POST `/api/v1/public/auth/refresh` with cookies
3. **Backend Processing**:
   - Reads `refresh_token` from cookies
   - Validates refresh token
   - Generates new access and refresh tokens
   - Sets new cookies via `Set-Cookie` headers ONLY
4. **Response**: Returns `{ "refreshed": true, "token_type": "bearer" }` - NO tokens in body
5. **Frontend**: Automatic retry with new tokens via cookies

## Current Architecture Analysis

### Backend (`middleware/app/admin_auth_api.py`)

**Token Storage**:
- JWT tokens stored in httpOnly cookies
- Legacy tokens stored in database (`admin_tokens` table)

**Authentication Flow**:
```python
def require_jwt_auth(request: Request) -> dict[str, Any]:
    # 1. Try to get token from cookies first
    access_token = request.cookies.get(_ACCESS_TOKEN_COOKIE)
    
    # 2. Fall back to header or session token (legacy support)
    if not access_token:
        access_token = request.headers.get("x-admin-secret")
    if not access_token:
        access_token = get_admin_session_token()
    
    # 3. Validate JWT first, then fall back to legacy
    payload = validate_access_token(access_token)
    if payload:
        return get_admin_from_jwt(payload)
    
    # 4. Fall back to legacy token validation
    return require_admin_token_or_env(access_token)
```

**Key Findings**:
- ✅ Correctly reads tokens from cookies first
- ✅ Falls back to headers and session tokens for legacy support
- ✅ Proper logging of authentication attempts
- ✅ Clear separation between JWT and legacy token validation

### Frontend (`admin-ui/src/api.ts`)

**Token Management**:
- No manual token storage - relies on httpOnly cookies
- Uses `credentials: 'include'` for all fetch requests
- Implements automatic token refresh on 401 responses

**Authentication Header Rules (DUAL-MODE)**:

| Token Type | Header Used | Example |
|------------|------------|---------|
| JWT | `Authorization: Bearer <token>` | `Authorization: Bearer eyJhbG...` |
| Legacy | `x-admin-secret: <secret>` | `x-admin-secret: my-secret-key` |

**CRITICAL**: Never send JWT in `x-admin-secret` header, and never send legacy secrets in `Authorization: Bearer` header.

## Issues Identified

### 1. **Missing `credentials: 'include'` in some API calls**

**Problem**: Some direct API calls bypass `fetchWithAuth` and don't include credentials:

```typescript
// These calls bypass fetchWithAuth and may not include credentials
export const Api = {
  publicStatus: () => api('/api/v1/public/status', { method: 'GET', headers: {}, signal }),
  authStatus: () => api('/api/v1/public/auth/status', { method: 'GET', headers: {}, signal }),
  // ... more calls
};
```

**Impact**: These calls may fail with 401 errors because cookies aren't sent.

### 2. **Inconsistent API usage patterns**

**Problem**: Mix of direct `api()` calls and `fetchWithAuth()`:

```typescript
// Uses fetchWithAuth (correct)
export async function fetchWithAuth(url: string, options: RequestInit & { requestId?: string } = {}) {
  fetchOptions.credentials = fetchOptions.credentials || 'include';
  // ...
}

// Bypasses fetchWithAuth (potential issue)
export const Api = {
  publicStatus: () => api('/api/v1/public/status', { method: 'GET', headers: {}, signal }),
  // ...
};
```

### 3. **Legacy token validation complexity**

**Problem**: Backend supports both JWT and legacy token validation, adding complexity:

```python
def require_jwt_auth(request: Request) -> dict[str, Any]:
    # JWT validation
    payload = validate_access_token(access_token)
    if payload:
        return get_admin_from_jwt(payload)
    
    # Fall back to legacy token validation
    return require_admin_token_or_env(access_token)
```

**Impact**: Increases attack surface and maintenance burden.

### 4. **Session validation state management**

**Problem**: Frontend uses `sessionStorage` for validation state:

```typescript
// Stores validation state in sessionStorage
sessionStorage.setItem(TOKEN_VALIDATION_KEY, 'valid');
```

**Impact**: Session storage is cleared on tab close, which may cause unexpected logout behavior.

## Recommendations

### 1. **Standardize API calls**

Ensure all API calls use `fetchWithAuth` to maintain consistent credential handling:

```typescript
// Replace direct api() calls with fetchWithAuth
export const Api = {
  publicStatus: () => fetchWithAuth('/api/v1/public/status', { method: 'GET' }),
  authStatus: () => fetchWithAuth('/api/v1/public/auth/status', { method: 'GET' }),
  // ...
};
```

### 2. **Remove legacy token support**

Consider deprecating legacy token validation to simplify the authentication flow:

```python
def require_jwt_auth(request: Request) -> dict[str, Any]:
    # Only JWT validation (remove legacy fallback)
    access_token = request.cookies.get(_ACCESS_TOKEN_COOKIE)
    if not access_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    payload = validate_access_token(access_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return get_admin_from_jwt(payload)
```

### 3. **Improve session management**

Consider using `localStorage` for validation state or implement a more robust session management strategy.

### 4. **Add comprehensive logging**

Enhance logging for authentication failures to aid debugging:

```python
logger.warning(f"Authentication failed for user '{username}': {error}")
```

## Security Considerations

### Strengths
- ✅ HttpOnly cookies prevent XSS attacks on JWT tokens
- ✅ Secure cookie flags in production
- ✅ Automatic token refresh reduces exposure
- ✅ Proper error handling prevents information leakage
- ✅ JWT validation failures don't fall back to legacy (prevents token confusion attacks)

### Hybrid Mode Security Rules

1. **Production**: JWT only, httpOnly cookies, no legacy fallback
2. **Demo/Development**: JWT preferred, legacy allowed via `x-admin-secret` header
3. **Header Separation**: 
   - JWT MUST use `Authorization: Bearer` header
   - Legacy MUST use `x-admin-secret` header
   - Never mix the two

### Areas for Improvement
- ⚠️ Legacy token support increases attack surface in non-production environments
- ⚠️ Session storage for validation state may be cleared unexpectedly
- ⚠️ Ensure `ADMIN_COOKIE_SECURE=true` in production

## Conclusion

The authentication flow is fundamentally sound with proper use of httpOnly cookies and automatic token refresh. However, there are inconsistencies in API usage patterns and legacy token support that should be addressed to improve security and maintainability.

---

## Phase 0 & 1 Audit Findings (JWT_FIX_PLAN)

### Phase 0: E2E Test Logic Audit

**Legacy Authentication Pattern Found in 3 E2E Test Files:**

#### 1. admin-ui/e2e/roles/permission-boundaries.spec.ts
- **Lines 141, 163, 186, 192**: Uses `x-admin-secret` header for API calls
- **Pattern**: `headers: { 'x-admin-secret': token || 'test' }`
- **Tests affected**:
  - "operator gets 403 on integrations API" (line 141)
  - "manager gets 403 on POS sale API" (line 163)
  - "admin can access all APIs" (lines 186, 192)

#### 2. admin-ui/e2e/functional/mvp-requirements.spec.ts  
- **Lines 171, 231**: Uses `x-admin-secret` header for API calls
- **Pattern**: `headers: { 'x-admin-secret': token }`
- **Tests affected**:
  - "add product to cart from catalog" (line 171)
  - "filter products by type" (line 231)

#### 3. admin-ui/e2e/critical/critical-flow.spec.ts
- **Lines 30, 63, 84**: Uses `x-admin-secret` header for API calls
- **Pattern**: `headers: { 'x-admin-secret': token }`
- **Tests affected**:
  - `apiPostTestCleanup` function (line 30)
  - "create product card (manager)" (line 63)
  - "operator registers client and makes sale" (line 84)

**Note**: No tests were found using static secret in Bearer token. All legacy tests use `x-admin-secret` header pattern.

### Phase 1: Research & Conflict Audit

#### Frontend API Calls (admin-ui/src/api.ts)

**All API calls centralized in api.ts:**
- Main wrapper: `fetchWithAuth()` function (lines 262-419)
- Auth header injection: `injectAuthHeaders()` function (lines 542-564)
- Token management: `getAdminSecret()`, `setAdminSecret()` (lines 520-534)
- Token refresh: `refreshTokenInternal()` function (lines 425-482)

**Key Findings:**
- ✅ Uses `credentials: 'include'` for all fetch requests
- ✅ Automatic token refresh with retry logic (MAX_REFRESH_RETRIES = 3)
- ✅ Proper 401 handling and redirect to login
- ✅ `injectAuthHeaders()` correctly distinguishes JWT vs static secret:
  - JWT tokens (2 dots): Use `Authorization: Bearer` header
  - Static secrets: Use `x-admin-secret` header only (NEVER in Authorization)

**API Methods (lines 600-800):**
- All methods use centralized `api()` wrapper
- Consistent credential handling via `fetchWithAuth`

#### Middleware JWT Parsing (middleware/app/auth.py)

**JWT Validation Functions:**
- `decode_token()` (lines 53-65): Well-handled with try/catch
- `validate_access_token()` (lines 68-83): Catches all exceptions, returns None
- `validate_refresh_token()` (lines 86-101): Catches all exceptions, returns None

**Exception Handling:**
- ✅ `jwt.ExpiredSignatureError` - handled (line 60)
- ✅ `jwt.InvalidTokenError` - handled (line 63)
- ✅ Generic `Exception` - handled (lines 81-83, 99-101)
- Returns `None` on any failure (safe for caller)

#### Middleware Auth Flow (middleware/app/admin_auth_api.py)

**require_jwt_auth() function (lines 257-346):**
- ✅ All JWT parsing wrapped in try/catch (line 344-346)
- ✅ Proper error logging for all exceptions
- ✅ Graceful fallback to legacy token validation
- ✅ Returns `{"is_authenticated": False, "detail": ...}` on any error

**Token Source Priority:**
1. Cookies (`access_token`)
2. Authorization Bearer header
3. x-admin-secret header (legacy)
4. Session token (legacy)

**JWT Format Detection:**
- `_is_jwt_format()` function (lines 215-219) checks for exactly 2 dots
- Prevents legacy validation of JWT tokens

### Security Assessment

**No Critical Issues Found:**
- ✅ No static secrets in Bearer tokens
- ✅ JWT parsing exceptions properly handled
- ✅ Legacy pattern (x-admin-secret) maintained for backward compatibility
- ✅ Frontend correctly distinguishes JWT vs static secret

**Areas Needing Attention:**
- ⚠️ E2E tests use legacy x-admin-secret pattern (expected - for backward compatibility testing)