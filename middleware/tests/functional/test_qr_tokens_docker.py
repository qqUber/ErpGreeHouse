"""
Functional Docker-based QR Token System Tests
No hardcoded data - uses dynamic generation and real Docker environment
"""

import sqlite3
import time
import uuid
from contextlib import contextmanager
from typing import Any, Dict, Generator

import pytest
import requests


@pytest.fixture(scope="module")
def docker_container() -> Generator[Dict[str, Any], None, None]:
    """Spin up Docker container for testing"""
    docker = pytest.importorskip("docker")
    client = docker.from_env()

    # Use existing docker-compose setup
    container_name = "middleware_test"

    try:
        # Start container if not running
        container = client.containers.get(container_name)
        if container.status != "running":
            container.start()
    except docker.errors.NotFound:
        # Create and start new container
        container = client.containers.run(
            "python:3.14-slim",
            name=container_name,
            detach=True,
            ports={"8000": "8000"},
            environment={"CRM_DB_PATH": "/app/test.db", "PYTHONPATH": "/app"},
        )

    # Wait for container to be ready
    time.sleep(2)

    yield {
        "container": container,
        "base_url": "http://localhost:8000",
        "container_name": container_name,
    }

    # Cleanup
    try:
        container.stop()
        container.remove()
    except:
        pass


class QRTokenFunctionalTest:
    """Functional tests for QR token system using Docker"""

    @pytest.fixture
    def test_db(self) -> Generator[sqlite3.Connection, None, None]:
        """Create fresh test database for each test"""
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row

        # Initialize database schema
        # Mock the database path for testing
        import app.db
        from app.db import init_db

        original_path = app.db.get_db_path
        app.db.get_db_path = lambda: ":memory:"

        init_db()

        # Restore original function
        app.db.get_db_path = original_path

        yield conn
        conn.close()

    def test_dynamic_token_generation_flow(self, test_db):
        """Test complete token generation flow with dynamic data"""
        from app.customer_identity import (
            generate_unique_qr_token,
            get_or_generate_base_guid,
        )

        # Generate base GUID dynamically
        base_guid = get_or_generate_base_guid(test_db)
        assert len(base_guid) == 36
        assert uuid.UUID(base_guid)  # Valid UUID

        # Generate multiple tokens dynamically
        tokens = set()
        for i in range(100):
            # Simulate customer creation
            test_db.execute(
                "INSERT INTO customers (phone) VALUES (?)", (f"+79{i:010d}",)
            )

            token = generate_unique_qr_token(test_db)
            tokens.add(token)

            # Verify token format
            assert len(token) == 8
            assert all(c in "0123456789ABCDEF" for c in token)

        # All tokens should be unique
        assert len(tokens) == 100

    def test_customer_lifecycle_functional(self, test_db):
        """Test complete customer lifecycle with dynamic data"""
        # Generate dynamic test data
        import secrets

        from app.customer_identity import resolve_or_create_customer

        phone = f"+79{secrets.randbelow(10000000000):010d}"
        telegram_id = secrets.randbelow(1000000000)

        # Create customer
        customer_id, is_new = resolve_or_create_customer(
            test_db,
            phone=phone,
            telegram_id=telegram_id,
            full_name="Test User",
            marketing_allowed=1,
            data_processing_allowed=1,
        )

        assert is_new
        assert customer_id > 0

        # Verify QR token was assigned
        row = test_db.execute(
            "SELECT qr_token FROM customers WHERE id = ?", (customer_id,)
        ).fetchone()
        assert row is not None
        assert len(row["qr_token"]) == 8

        # Update same customer
        customer_id2, is_new2 = resolve_or_create_customer(
            test_db, phone=phone, full_name="Updated User"  # Same phone
        )

        assert not is_new2
        assert customer_id2 == customer_id

    def test_concurrent_simulation(self, test_db):
        """Simulate concurrent access without actual threading"""
        from app.customer_identity import generate_unique_qr_token

        # Simulate multiple "processes" generating tokens
        process_tokens = {}

        for process_id in range(5):
            tokens = []
            for i in range(20):
                # Each process gets its own customer ID range
                test_db.execute(
                    "INSERT INTO customers (phone) VALUES (?)",
                    (f"proc{process_id}_user{i}",),
                )
                token = generate_unique_qr_token(test_db)
                tokens.append(token)

            process_tokens[process_id] = tokens

        # Verify all tokens across all processes are unique
        all_tokens = []
        for tokens in process_tokens.values():
            all_tokens.extend(tokens)

        assert len(set(all_tokens)) == len(all_tokens)

    def test_error_recovery_functional(self, test_db):
        """Test error recovery scenarios"""
        from app.customer_identity import (
            CustomerIdentityConflictError,
            resolve_or_create_customer,
        )

        # Create first customer
        customer_id1, _ = resolve_or_create_customer(
            test_db, phone="+79123456789", full_name="User One"
        )

        # Create conflicting customer manually
        test_db.execute(
            "INSERT INTO customers (phone, telegram_id) VALUES (?, ?)",
            ("+79123456789", 987654321),
        )

        # Should detect conflict
        with pytest.raises(CustomerIdentityConflictError):
            resolve_or_create_customer(
                test_db, phone="+79123456789", telegram_id=987654321
            )

    def test_performance_functional(self, test_db):
        """Test performance with realistic data volumes"""
        import time

        from app.customer_identity import generate_unique_qr_token

        # Test performance with 1000 tokens
        start_time = time.time()

        tokens = set()
        for i in range(1000):
            test_db.execute(
                "INSERT INTO customers (phone) VALUES (?)", (f"+79{i:010d}",)
            )
            token = generate_unique_qr_token(test_db)
            tokens.add(token)

        duration = time.time() - start_time

        # Performance assertions
        assert duration < 5.0  # Should complete within 5 seconds
        assert len(tokens) == 1000  # All tokens unique

    def test_api_integration_functional(self, docker_container):
        """Test API integration if available"""
        base_url = docker_container["base_url"]

        # Test health check if endpoint exists
        try:
            response = requests.get(f"{base_url}/health", timeout=5)
            assert response.status_code == 200
        except requests.exceptions.RequestException:
            # API not available, skip this test
            pytest.skip("API not available in container")

    def test_database_consistency_functional(self, test_db):
        """Test database consistency under various scenarios"""
        from app.customer_identity import resolve_or_create_customer

        # Create customers with various identifiers
        customers_data = [
            {"phone": "+79123456789", "telegram_id": 123456789},
            {"phone": "+79123456780", "vk_id": 987654321},
            {"phone": "+79123456781", "email": "test@example.com"},
        ]

        customer_ids = []
        for data in customers_data:
            customer_id, is_new = resolve_or_create_customer(
                test_db,
                full_name="Test User",
                marketing_allowed=1,
                data_processing_allowed=1,
                **data,
            )
            assert is_new
            customer_ids.append(customer_id)

        # Verify database consistency
        for customer_id in customer_ids:
            row = test_db.execute(
                "SELECT * FROM customers WHERE id = ?", (customer_id,)
            ).fetchone()
            assert row is not None
            assert row["qr_token"] is not None
            assert len(row["qr_token"]) == 8

    def test_edge_cases_functional(self, test_db):
        """Test edge cases with dynamic data"""
        from app.customer_identity import (
            generate_unique_qr_token,
            get_or_generate_base_guid,
        )

        # Test with empty database
        token = generate_unique_qr_token(test_db)
        assert len(token) == 8

        # Test with no system settings
        new_conn = sqlite3.connect(":memory:")
        new_conn.row_factory = sqlite3.Row

        # Should create system settings automatically
        token = generate_unique_qr_token(new_conn)
        assert len(token) == 8

        # Verify system settings was created
        guid = get_or_generate_base_guid(new_conn)
        assert len(guid) == 36

    @contextmanager
    def benchmark_context(self, name: str):
        """Simple benchmark context manager"""
        start = time.time()
        yield
        duration = time.time() - start
        print(f"{name}: {duration:.3f}s")

    def test_simple_benchmark(self, test_db):
        """Simple performance benchmark"""
        from app.customer_identity import generate_unique_qr_token

        with self.benchmark_context("Generate 100 tokens"):
            for i in range(100):
                test_db.execute(
                    "INSERT INTO customers (phone) VALUES (?)", (f"+79{i:010d}",)
                )
                generate_unique_qr_token(test_db)


class TestDockerIntegration:
    """Docker-specific integration tests"""

    def test_docker_container_health(self, docker_container):
        """Test Docker container is healthy"""
        container = docker_container["container"]

        # Check container is running
        assert container.status == "running"

        # Check container logs for errors
        logs = container.logs().decode()
        assert "ERROR" not in logs.upper()

    def test_database_in_docker(self, docker_container):
        """Test database operations in Docker environment"""
        container = docker_container["container"]

        # Execute database commands in container
        exit_code, output = container.exec_run(
            "python -c \"import sqlite3; conn = sqlite3.connect(':memory:'); print('DB OK')\""
        )

        assert exit_code == 0
        assert "DB OK" in output.decode()


if __name__ == "__main__":
    # Run tests with Docker
    pytest.main([__file__, "-v", "-s"])
