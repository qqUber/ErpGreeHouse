# CONVENTIONS.md - Coding Conventions

## Overview

This document outlines the coding conventions used in ErpGreeHouse to ensure consistency and maintainability across the codebase.

## Python Conventions (Backend)

### 1. Style Guidelines

**PEP 8 Compliance**: All Python code follows PEP 8 guidelines.

**Line Length**: Maximum 88 characters (Black default).

**Indentation**: 4 spaces per indentation level.

**Imports**:
- Grouped by type (standard library, third-party, local)
- Sorted alphabetically within each group
- Use absolute imports for modules within the project

```python
# Standard library
import os
import logging
from typing import Any, Dict, List

# Third-party
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Local
from app.db import get_db
from app.schemas import CustomerCreate, CustomerResponse
from app.crud import customer_crud
```

### 2. Naming Conventions

**Files/Directories**: Lowercase with underscores (snake_case)
```
admin_api.py
customer_crud.py
```

**Classes**: PascalCase
```python
class CustomerService:
    ...
```

**Functions/Methods**: snake_case
```python
def get_customer(db: Session, customer_id: int):
    ...
```

**Variables**: snake_case
```python
customer_name = "John Doe"
```

**Constants**: UPPERCASE_SNAKE_CASE
```python
MAX_CONCURRENT_REQUESTS = 100
```

**Type Annotations**: Use type hints for all function parameters and return types
```python
def create_customer(db: Session, customer: CustomerCreate) -> CustomerResponse:
    ...
```

### 3. Code Organization

**Modules**: Each module should have a single responsibility

**Functions**: Keep functions small and focused on one task

**Classes**: Use classes for complex logic that requires state

**Docstrings**: Use Google-style docstrings
```python
def get_customer(db: Session, customer_id: int) -> CustomerResponse:
    """Get a single customer by ID.
    
    Args:
        db: Database session
        customer_id: ID of the customer to retrieve
        
    Returns:
        CustomerResponse: Customer data
        
    Raises:
        HTTPException: If customer not found
    """
    ...
```

### 4. Error Handling

**Exceptions**: Catch specific exceptions, not general ones
```python
try:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
except SQLAlchemyError as e:
    logger.error(f"Database error when getting customer: {str(e)}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

**Error Responses**: Use HTTPException with appropriate status codes
```python
from fastapi import HTTPException

raise HTTPException(status_code=404, detail="Customer not found")
```

### 5. Logging

**Logging Levels**:
- `DEBUG`: Detailed debugging information
- `INFO`: General information about application operation
- `WARNING`: Warning messages about potential issues
- `ERROR`: Error messages about failed operations
- `CRITICAL`: Critical errors that require immediate attention

**Logger Configuration**:
```python
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Add handler to log to file
file_handler = logging.FileHandler("app.log")
file_handler.setLevel(logging.INFO)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)
```

**Logging Usage**:
```python
logger.info(f"Creating customer: {customer_name}")
logger.error(f"Failed to create customer: {str(e)}")
```

### 6. Database Queries

**ORM Usage**: Use SQLAlchemy ORM for database operations

**Query Formatting**:
```python
# Get single customer
customer = db.query(Customer).filter(Customer.id == customer_id).first()

# Get all active customers
active_customers = db.query(Customer).filter(Customer.is_active == True).all()

# Create customer
new_customer = Customer(name=customer_data.name, email=customer_data.email)
db.add(new_customer)
db.commit()
db.refresh(new_customer)
```

**Error Handling**: Catch SQLAlchemy exceptions
```python
from sqlalchemy.exc import SQLAlchemyError

try:
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
except SQLAlchemyError as e:
    db.rollback()
    logger.error(f"Database error: {str(e)}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

## TypeScript/React Conventions (Frontend)

### 1. Style Guidelines

**Biome Configuration**: Use Biome for formatting and linting

**Line Length**: Maximum 80 characters

**Indentation**: 2 spaces per indentation level

**Imports**: Sorted alphabetically
```typescript
// React and hooks
import { useState, useEffect } from "react";

// Components
import { Button } from "./Button";
import { Input } from "./Input";

// Services
import { customerService } from "../services/customerService";

// Types
import { Customer } from "../types/customer";
```

### 2. Naming Conventions

**Files/Directories**:
- Components: PascalCase or kebab-case
- Services: camelCase or kebab-case
- Utilities: camelCase or kebab-case
```
CustomerList.tsx
customerService.ts
utils.ts
```

**Components**: PascalCase
```typescript
const CustomerList = () => {
    ...
};
```

**Functions/Methods**: camelCase
```typescript
const getCustomers = async () => {
    ...
};
```

**Variables**: camelCase
```typescript
const customerName = "John Doe";
```

**Constants**: UPPERCASE_SNAKE_CASE or camelCase for object/array constants
```typescript
const MAX_CUSTOMERS = 100;

const DEFAULT_FILTERS = {
    active: true,
    search: "",
};
```

**Type Interfaces/Types**: PascalCase
```typescript
interface Customer {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
}

type CustomerStatus = "active" | "inactive" | "pending";
```

### 3. Code Organization

**Components**:
- Keep components small and focused
- Split complex components into sub-components
- Use TypeScript interfaces for props

```typescript
interface CustomerListProps {
    customers: Customer[];
    onCustomerSelect: (customer: Customer) => void;
}

const CustomerList = ({ customers, onCustomerSelect }: CustomerListProps) => {
    return (
        <div>
            {customers.map((customer) => (
                <div key={customer.id} onClick={() => onCustomerSelect(customer)}>
                    {customer.name}
                </div>
            ))}
        </div>
    );
};
```

**Hooks**:
- Custom hooks should start with "use"
- Keep hooks focused on one functionality

```typescript
const useCustomerData = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await customerService.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setLoading(false);
        }
    };

    return { customers, loading, fetchCustomers };
};
```

### 4. Error Handling

**Try-Catch**: Use try-catch for async operations
```typescript
const fetchCustomers = async () => {
    try {
        const data = await customerService.getCustomers();
        setCustomers(data);
    } catch (error) {
        console.error("Error fetching customers:", error);
        setError("Failed to fetch customers");
    }
};
```

**Error Boundaries**: Use React error boundaries for component-level error handling

### 5. State Management

**React Hooks**: Use useState and useEffect for local state
```typescript
const [customers, setCustomers] = useState<Customer[]>([]);
const [loading, setLoading] = useState(false);
```

**Context API**: Use Context API for global state
```typescript
const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const CustomerProvider = ({ children }: CustomerProviderProps) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const data = await customerService.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        customers,
        loading,
        fetchCustomers,
    };

    return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
};
```

### 6. API Calls

**Axios/Fetch**: Use fetch or axios for API calls
```typescript
// Using fetch
const getCustomers = async (): Promise<Customer[]> => {
    const response = await fetch("/api/customers");
    if (!response.ok) {
        throw new Error("Failed to fetch customers");
    }
    return await response.json();
};

// Using axios
import axios from "axios";

const getCustomers = async (): Promise<Customer[]> => {
    try {
        const response = await axios.get("/api/customers");
        return response.data;
    } catch (error) {
        console.error("Error fetching customers:", error);
        throw new Error("Failed to fetch customers");
    }
};
```

### 7. Testing

**Unit Tests**: Use Vitest for unit tests
```typescript
import { describe, it, expect, vi } from "vitest";
import { getCustomers } from "../services/customerService";

describe("getCustomers", () => {
    it("should fetch customers successfully", async () => {
        const mockCustomers = [
            { id: 1, name: "John Doe", email: "john@example.com" },
        ];

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockCustomers),
        });

        const customers = await getCustomers();
        expect(customers).toEqual(mockCustomers);
        expect(global.fetch).toHaveBeenCalledWith("/api/customers");
    });

    it("should handle fetch errors", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            statusText: "Internal Server Error",
        });

        await expect(getCustomers()).rejects.toThrow("Failed to fetch customers");
    });
});
```

**E2E Tests**: Use Playwright for E2E tests
```typescript
import { test, expect } from "@playwright/test";

test("should display customers", async ({ page }) => {
    await page.goto("/customers");
    
    // Wait for customers to load
    await page.waitForSelector('[data-testid="customer-item"]');
    
    // Check if at least one customer is displayed
    const customerItems = await page.$$('[data-testid="customer-item"]');
    expect(customerItems.length).toBeGreaterThan(0);
});
```

## Common Conventions

### 1. Git Conventions

**Branch Naming**:
```
feature/Add-customer-search
bugfix/Fix-customer-creation
docs/Update-readme
```

**Commit Messages**:
```
feat: Add customer search functionality
fix: Fix customer creation error
docs: Update README with installation instructions
```

**Commit Message Guidelines**:
- Use imperative mood
- Limit subject line to 50 characters
- Capitalize subject line
- Do not end subject line with period
- Use body to explain "what" and "why"

### 2. Documentation

**Inline Comments**: Use comments to explain complex logic
```python
# Calculate loyalty points based on order total (1 point per $1 spent)
points = int(order_total)
```

**README Files**: Each directory should have a README.md explaining its purpose

**API Documentation**: Use FastAPI's automatic documentation (http://localhost:8000/docs)

### 3. Security

**Input Validation**: Validate all user inputs
```python
from pydantic import BaseModel, EmailStr, validator

class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    
    @validator("name")
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v
```

**SQL Injection Prevention**: Use parameterized queries or ORM

**XSS Prevention**: Escape user-generated content

### 4. Performance

**Caching**: Use Redis for frequently accessed data

**Rate Limiting**: Implement rate limiting for API endpoints

**Async**: Use asyncio for I/O-bound operations

## Tools and Configuration

### Python Tools

- **Formatter**: Black
- **Linter**: Ruff
- **Type Checker**: Mypy
- **Testing**: Pytest
- **Pre-commit Hooks**: pre-commit with Black, Ruff, Mypy, etc.

### TypeScript/React Tools

- **Formatter**: Biome
- **Linter**: Biome
- **Type Checker**: TypeScript
- **Testing**: Vitest (unit), Playwright (E2E)
- **Build Tool**: Vite

## Compliance

**152-FZ**: Ensure all personal data handling complies with Russian data protection law (152-FZ)

**GDPR**: For EU customers, ensure GDPR compliance

## Review Process

All code changes should go through a review process:
1. Create a feature branch
2. Make changes following the conventions
3. Run tests
4. Create a pull request
5. Get reviewed and approved
6. Merge into main