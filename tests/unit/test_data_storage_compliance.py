"""
Tests for data storage compliance with 152-FZ requirements.
"""

import os
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))


class TestDataStorageCompliance(unittest.TestCase):
    """Tests for data storage compliance with 152-FZ requirements."""

    def test_docker_compose_configuration(self):
        """Test that Docker Compose configuration exists and contains required services."""
        docker_compose_path = Path("prod/docker-compose.yml")
        self.assertTrue(docker_compose_path.exists(), "docker-compose.yml not found")

        with open(docker_compose_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("postgres", content, "PostgreSQL service not configured")
        self.assertIn("redis-queue", content, "Redis service not configured")

        # Check for compliance comments
        self.assertIn(
            "Data Localization Compliance (152-FZ)",
            content,
            "Compliance comments not found",
        )
        self.assertIn(
            "База данных размещается на территории РФ",
            content,
            "PostgreSQL compliance comment not found",
        )
        self.assertIn(
            "Redis кэш размещается на территории РФ",
            content,
            "Redis compliance comment not found",
        )

    def test_environment_configuration(self):
        """Test that environment configuration exists and contains required settings."""
        env_config_path = Path("prod/.env.production.example")
        self.assertTrue(env_config_path.exists(), ".env.production.example not found")

        with open(env_config_path, "r", encoding="utf-8") as f:
            content = f.read()

        required_settings = [
            "ENVIRONMENT",
            "DB_USER",
            "DB_PASSWORD",
            "DB_NAME",
            "DATABASE_URL",
            "REDIS_URL",
            "JWT_SECRET_KEY",
        ]

        for setting in required_settings:
            with self.subTest(setting=setting):
                self.assertIn(setting, content, f"{setting} not configured")

    def test_compliance_documentation(self):
        """Test that compliance documentation exists and contains required sections."""
        doc_path = Path("docs/compliance/data_storage_compliance.md")
        self.assertTrue(doc_path.exists(), "data_storage_compliance.md not found")

        with open(doc_path, "r", encoding="utf-8") as f:
            content = f.read()

        required_sections = [
            "Data Localization",
            "Production Environment Configuration",
            "Compliance Verification",
            "Data Backup and Retention",
            "Incident Response",
        ]

        for section in required_sections:
            with self.subTest(section=section):
                self.assertIn(section, content, f"Section '{section}' not found")

    def test_compliance_script(self):
        """Test that compliance verification script exists and is executable."""
        script_path = Path("scripts/verify_compliance.py")
        self.assertTrue(script_path.exists(), "verify_compliance.py not found")
        self.assertTrue(
            os.access(script_path, os.X_OK), "verify_compliance.py not executable"
        )


if __name__ == "__main__":
    unittest.main()
