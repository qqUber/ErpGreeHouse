# Architecture Overview

## System Architecture

ErpGreeHouse is a modern, two-tier SaaS application for small to medium-sized businesses that combines customer relationship management (CRM), point-of-sale (POS), and loyalty program management. The system follows a decoupled frontend-backend architecture with a RESTful API interface.

### Frontend
- **Technology Stack**: React 19 + TypeScript + Vite
- **Deployment**: Served as static files from FastAPI backend
- **Key Features**: Responsive UI, multi-role access, real-time dashboards, and offline capabilities

### Backend
- **Technology Stack**: FastAPI (Python 3.10+)
- **Database**: SQLite (with WAL mode for concurrency)
- **Key Features**: RESTful API, authentication/authorization, background jobs, and third-party integrations

## Frontend-Backend Communication

### API Architecture
- **Base URL**: `/api/v1/`
- **Communication Protocol**: HTTP/HTTPS with JSON payloads
- **Authentication**: JWT tokens stored in httpOnly cookies
- **Token Refresh**: Automatic refresh using refresh token endpoint

### API Structure
```
/api/v1/
├── public/             # Public endpoints (no auth required)
│   ├── status         # Health check
│   └── auth/          # Authentication (login, refresh, recover)
├── auth/              # Protected endpoints
│   └── me             # Get current user
├── dashboard/         # Dashboard data
├── customers/         # Customer management
├── products/          # Product management
├── pos/               # Point of sale
├── integrations/      # Integration management
├── marketing/         # Marketing campaigns
└── analytics/         # Analytics endpoints
```

### Data Flow Patterns

#### Authentication Flow
```
1. User logs in with username/password
2. Backend returns JWT access/refresh tokens in httpOnly cookies
3. Frontend uses access token for API requests
4. Token expires → frontend automatically refreshes using refresh token
5. Refresh token expires → user is redirected to login
```

#### Data Fetching
```
1. Component mounts → useEffect triggers data load
2. API call is made using fetchWithAuth wrapper
3. Response is parsed and stored in local state
4. Component re-renders with new data
5. Errors are caught and displayed as notifications
```

## Key Components

### Frontend Components

#### Core Components
- **App.tsx**: Main application component with tab-based navigation
- **AuthProvider**: Context provider for authentication state
- **Api.ts**: API client with authentication interceptors
- **Toast**: Notification system for user feedback

#### Views
- **Dashboard**: Role-specific dashboards (Admin, Manager, Operator)
- **Customers**: Customer list with search and pagination
- **Products**: Product management with import/export
- **POS**: Point-of-sale interface
- **Integrations**: Integration settings (Telegram, VK)
- **Marketing**: Campaign and trigger management
- **Compliance**: Data compliance and consent management
- **Analytics**: Detailed analytics and reports

#### Hooks
- **useAuth**: Authentication state and operations
- **useDashboard**: Dashboard data fetching
- **usePermission**: Permission checking
- **useAppTranslation**: i18n translations

### Backend Components

#### API Routers
- **admin_auth_api.py**: Authentication endpoints
- **admin_api.py**: Admin user management
- **customers_api.py**: Customer management
- **products_api.py**: Product management
- **pos_api.py**: Point-of-sale operations
- **marketing_api.py**: Marketing campaigns
- **analytics_api.py**: Analytics endpoints
- **integrations_api.py**: Integration management
- **dashboard_api.py**: Dashboard data

#### Core Services
- **auth.py**: JWT token generation and validation
- **db.py**: Database connection and migrations
- **config.py**: Configuration management
- **worker.py**: Background job processing
- **middleware.py**: Rate limiting and security

#### Integrations
- **telegram_handler.py**: Telegram bot integration
- **vk_handler.py**: VKontakte bot integration
- **erp_sync.py**: ERP system synchronization

## State Management

### Frontend State

#### Local Component State
- React useState for component-specific state
- useEffect for side effects (data fetching, event listeners)

#### Global State (Context API)
- **AuthContext**: Authentication state (user, isAuthenticated, isLoading)
- **AuthProvider**: Manages login, logout, token refresh, and session restoration

#### Storage
- **LocalStorage**: Stores legacy admin secrets (for backward compatibility)
- **SessionStorage**: Stores token validation state (for secure session management)
- **Cookies**: JWT tokens stored as httpOnly cookies (httponly, secure flags)

#### Key State Variables (App.tsx)
```typescript
- isAuthenticated: boolean     // User logged in state
- user: AdminMe | null         // Current user data
- tab: Tab                     // Active tab
- customers: CustomerListItem[] // Customer list
- products: Product[]          // Product list
- dash: Dashboard | null       // Dashboard data
- details: CustomerDetails | null // Selected customer details
```

### Backend State

#### Request Context
- **Request state**: Stores authenticated user information (via middleware)
- **Database connection**: SQLite connection per request (with row factory)
- **Config**: Environment-specific settings (via Settings dataclass)

#### Database Tables
```
admin_users              # Admin user accounts
admin_tokens             # JWT tokens
role_permissions         # Role-based permissions
customers                # Customer data
transactions             # POS transactions
products                 # Product catalog
consents                 # Data consent records
marketing_campaigns      # Marketing campaigns
marketing_triggers       # Automated triggers
integrations             # Third-party integrations
vk_settings              # VKontakte settings
sync_log                 # Sync history
```

## Data Flow Diagrams

### User Authentication Flow
```
+----------------+         +----------------+         +----------------+
|   Login Form   |         |   Auth API      |         |  Database      |
+----------------+         +----------------+         +----------------+
         |                          |                          |
         | POST /api/v1/public/auth/login                          |
         |------------------------->|                          |
         |                          |                          |
         |                          | Validate credentials     |
         |                          |------------------------->|
         |                          |                          |
         |                          | Return JWT tokens        |
         |<-------------------------|                          |
         |                          |                          |
         | Store tokens in cookies  |                          |
         |------------------------->|                          |
         |                          |                          |
         | Fetch user data (me)    |                          |
         |------------------------->|                          |
         |                          |                          |
         |                          | Return user info         |
         |<-------------------------|                          |
         |                          |                          |
         | Update state            |                          |
         |------------------------->|                          |
```

### Data Fetching Flow
```
+----------------+         +----------------+         +----------------+
|   Component    |         |   API Client   |         |  Backend API   |
+----------------+         +----------------+         +----------------+
         |                          |                          |
         | useEffect (mount)       |                          |
         |------------------------->|                          |
         |                          |                          |
         | fetchWithAuth           |                          |
         |------------------------->|                          |
         |                          |                          |
         |                          | API endpoint             |
         |                          |------------------------->|
         |                          |                          |
         |                          | Query database           |
         |                          |------------------------->|
         |                          |                          |
         |                          | Return JSON response     |
         |<-------------------------|                          |
         |                          |                          |
         | Parse and validate      |                          |
         |------------------------->|                          |
         |                          |                          |
         | Update component state  |                          |
         |------------------------->|                          |
```

## Performance Optimizations

### Frontend
- **Code Splitting**: Dynamic import for large components
- **Lazy Loading**: Images and components loaded on demand
- **Caching**: API responses cached with appropriate TTL
- **Debouncing**: Search input debounced for better performance

### Backend
- **Database Indexes**: Optimized queries with indexes
- **Connection Pooling**: SQLite with WAL mode for concurrency
- **Response Compression**: GZip middleware for large responses
- **Rate Limiting**: Sliding window rate limiting for API endpoints

## Security Measures

### Authentication
- **JWT Tokens**: Short-lived access tokens (30 mins), refresh tokens (30 days)
- **httpOnly Cookies**: Tokens stored in httponly cookies to prevent XSS attacks
- **Token Refresh**: Secure refresh token rotation
- **Password Hashing**: PBKDF2 with salt and iterations

### Authorization
- **Role-Based Access Control (RBAC)**: Owner, Manager, Operator, Marketer roles
- **Permission Checks**: Granular permissions per endpoint
- **Middleware Protection**: Auth middleware for all protected routes

### Data Security
- **Encryption**: Data transmitted over HTTPS
- **Input Validation**: Request body validation with Pydantic
- **SQL Injection Protection**: Parameterized queries with SQLite
- **CORS Configuration**: Restricted to trusted origins

## Scalability Considerations

### Current Architecture
- **Monolithic Backend**: All services in single FastAPI application
- **SQLite Database**: File-based, suitable for small-scale deployments
- **Background Jobs**: Simple async workers for Telegram updates

### Future Improvements
- **Database Sharding**: Partition large tables (customers, transactions)
- **Cache Layer**: Redis for frequent queries
- **Message Queue**: RabbitMQ/Kafka for background jobs
- **Horizontal Scaling**: Load balancing across multiple instances