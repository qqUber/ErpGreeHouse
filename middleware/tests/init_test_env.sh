#!/bin/bash
# Test Environment Initialization Script
# Location: middleware/tests/init_test_env.sh
# This script sets up the test environment for E2E tests

set -e

echo "=========================================="
echo "Initializing Test Environment"
echo "=========================================="

# Change to middleware directory
cd "$(dirname "$0")/.."

# Set PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$(pwd)
echo "PYTHONPATH=$PYTHONPATH"

# Function to check Redis connectivity
check_redis() {
    echo "Checking Redis connectivity..."
    if command -v redis-cli &> /dev/null; then
        # Try to ping Redis
        if redis-cli ping > /dev/null 2>&1; then
            echo "✓ Redis is accessible"
            return 0
        else
            echo "✗ Redis is not accessible"
            return 1
        fi
    else
        echo "✗ redis-cli not found"
        return 1
    fi
}

# Wait for Redis with timeout
wait_for_redis() {
    local max_attempts=${1:-30}
    local attempt=1
    
    echo "Waiting for Redis (max ${max_attempts}s)..."
    while [ $attempt -le $max_attempts ]; do
        if check_redis; then
            echo "✓ Redis is ready after ${attempt}s"
            return 0
        fi
        echo "  Attempt $attempt/$max_attempts - Redis not ready, waiting..."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo "✗ ERROR: Redis did not become ready in ${max_attempts}s"
    return 1
}

# Setup SQLite test database
setup_database() {
    local db_path=${1:-test_telegram_crm.db}
    
    echo "Setting up test database: $db_path"
    
    # Remove existing database for clean state
    if [ -f "$db_path" ]; then
        echo "  Removing existing database..."
        rm -f "$db_path"
    fi
    
    # Create database and seed data using Python
    python -c "
import sqlite3
import os

db_path = '$db_path'

conn = sqlite3.connect(db_path)

# Create admin_users table
conn.execute('''
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

# Seed test users (password: test123 for all)
# This is the bcrypt hash of 'test123'
password_hash = '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqPLUzC7J2'

conn.execute('INSERT OR IGNORE INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)', 
    ('admin', password_hash, 'admin'))
conn.execute('INSERT OR IGNORE INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)', 
    ('manager', password_hash, 'manager'))
conn.execute('INSERT OR IGNORE INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)', 
    ('operator', password_hash, 'operator'))

conn.commit()
conn.close()

print(f'Database {db_path} created and seeded successfully')
"
    
    if [ -f "$db_path" ]; then
        echo "✓ Database created: $db_path"
        return 0
    else
        echo "✗ ERROR: Failed to create database"
        return 1
    fi
}

# Verify backend is ready
verify_backend() {
    local max_attempts=${1:-30}
    local attempt=1
    
    echo "Waiting for backend (max ${max_attempts}s)..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
            echo "✓ Backend is ready after ${attempt}s"
            return 0
        fi
        echo "  Attempt $attempt/$max_attempts - Backend not ready, waiting..."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo "✗ ERROR: Backend did not become ready in ${max_attempts}s"
    return 1
}

# Main execution
main() {
    echo ""
    
    # Check Redis
    if ! wait_for_redis 30; then
        echo "ERROR: Redis is not available"
        exit 1
    fi
    
    echo ""
    
    # Setup database
    if ! setup_database "test_telegram_crm.db"; then
        echo "ERROR: Failed to setup database"
        exit 1
    fi
    
    echo ""
    echo "=========================================="
    echo "Test Environment Initialized Successfully"
    echo "=========================================="
    echo ""
    echo "Test users created:"
    echo "  - admin (role: admin, password: test123)"
    echo "  - manager (role: manager, password: test123)"
    echo "  - operator (role: operator, password: test123)"
    echo ""
}

# Run main function
main "$@"
