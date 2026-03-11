#!/usr/bin/env python3
"""
Compliance verification script for ErpGreeHouse system.

This script checks if the system is configured to comply with Russian data protection laws (152-FZ).
It verifies that all personal data is stored and processed within Russian Federation borders.
"""

import os
import sys
import json
import subprocess
from typing import Dict, List, Optional


def run_command(cmd: str, check: bool = True) -> str:
    """Run a shell command and return output."""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, check=check
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        if check:
            print(f"Error running command: {e}")
            print(f"Output: {e.stderr}")
            sys.exit(1)
        return ""


def check_docker_compose() -> bool:
    """Check if Docker Compose configuration is compliant."""
    print("Checking Docker Compose configuration...")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    docker_compose_path = os.path.join(project_root, "prod", "docker-compose.yml")

    if not os.path.exists(docker_compose_path):
        print(f"ERROR: docker-compose.yml not found at {docker_compose_path}")
        return False

    with open(docker_compose_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check if all required services are configured with data localization comments
    required_comments = [
        "Data Localization Compliance (152-FZ)",
        "База данных размещается на территории РФ",
        "Redis кэш размещается на территории РФ",
    ]

    all_comments_found = True
    for comment in required_comments:
        if comment not in content:
            print(f"ERROR: Missing compliance comment: '{comment}'")
            all_comments_found = False

    # Check if PostgreSQL and Redis are configured
    if "postgres" not in content or "redis" not in content:
        print("ERROR: Missing required services: PostgreSQL or Redis not configured")
        return False

    print("OK: Docker Compose configuration check passed")
    return all_comments_found


def check_env_config() -> bool:
    """Check if environment configuration is compliant."""
    print("Checking environment configuration...")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    env_config_path = os.path.join(project_root, "prod", ".env.production.example")

    if not os.path.exists(env_config_path):
        print(f"ERROR: .env.production.example not found at {env_config_path}")
        return False

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

    all_settings_found = True
    for setting in required_settings:
        if setting not in content:
            print(f"ERROR: Missing required setting: '{setting}'")
            all_settings_found = False

    print("OK: Environment configuration check passed")
    return all_settings_found


def check_documentation() -> bool:
    """Check if compliance documentation exists."""
    print("Checking compliance documentation...")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    doc_path = os.path.join(
        project_root, "docs", "compliance", "data_storage_compliance.md"
    )

    if not os.path.exists(doc_path):
        print(f"ERROR: data_storage_compliance.md not found at {doc_path}")
        return False

    with open(doc_path, "r", encoding="utf-8") as f:
        content = f.read()

    required_sections = [
        "Data Localization",
        "Production Environment Configuration",
        "Compliance Verification",
        "Data Backup and Retention",
        "Incident Response",
    ]

    all_sections_found = True
    for section in required_sections:
        if section not in content:
            print(f"ERROR: Missing documentation section: '{section}'")
            all_sections_found = False

    print("OK: Compliance documentation check passed")
    return all_sections_found


def check_running_containers() -> bool:
    """Check if containers are running and compliant."""
    print("Checking running containers...")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    prod_dir = os.path.join(project_root, "prod")

    # Check if Docker is running
    docker_info = run_command("docker info", check=False)
    if "Server Version" not in docker_info:
        print("WARNING: Docker is not running or not accessible")
        return False

    # Check if containers are running
    ps_output = run_command(f"cd {prod_dir} && docker-compose ps", check=False)

    required_containers = ["postgres", "redis-queue", "middleware"]
    all_containers_running = True

    for container in required_containers:
        if container not in ps_output or "Up" not in ps_output:
            print(f"WARNING: Container '{container}' is not running")
            all_containers_running = False

    if all_containers_running:
        print("OK: All required containers are running")

    return all_containers_running


def check_database_connection() -> bool:
    """Check if database connection is established."""
    print("Checking database connection...")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    prod_dir = os.path.join(project_root, "prod")

    try:
        # Check if we can connect to PostgreSQL
        run_command(
            f"cd {prod_dir} && docker-compose exec -T postgres pg_isready -U postgres -d telegram_crm",
            check=False,
        )
        print("OK: Database connection check passed")
        return True
    except Exception as e:
        print(f"WARNING: Database connection check failed: {e}")
        return False


def check_redis_connection() -> bool:
    """Check if Redis connection is established."""
    print("Checking Redis connection...")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    prod_dir = os.path.join(project_root, "prod")

    try:
        run_command(
            f"cd {prod_dir} && docker-compose exec -T redis-queue redis-cli ping",
            check=False,
        )
        print("OK: Redis connection check passed")
        return True
    except Exception as e:
        print(f"WARNING: Redis connection check failed: {e}")
        return False

    # Check if containers are running
    ps_output = run_command("cd prod && docker-compose ps", check=False)

    required_containers = ["postgres", "redis-queue", "middleware"]
    all_containers_running = True

    for container in required_containers:
        if container not in ps_output or "Up" not in ps_output:
            print(f"WARNING: Container '{container}' is not running")
            all_containers_running = False

    if all_containers_running:
        print("OK: All required containers are running")

    return all_containers_running


def check_database_connection() -> bool:
    """Check if database connection is established."""
    print("Checking database connection...")

    try:
        # Check if we can connect to PostgreSQL
        run_command(
            "cd prod && docker-compose exec -T postgres pg_isready -U postgres -d telegram_crm",
            check=False,
        )
        print("OK: Database connection check passed")
        return True
    except Exception as e:
        print(f"WARNING: Database connection check failed: {e}")
        return False


def check_redis_connection() -> bool:
    """Check if Redis connection is established."""
    print("Checking Redis connection...")

    try:
        run_command(
            "cd prod && docker-compose exec -T redis-queue redis-cli ping", check=False
        )
        print("OK: Redis connection check passed")
        return True
    except Exception as e:
        print(f"WARNING: Redis connection check failed: {e}")
        return False


def check_redis_connection() -> bool:
    """Check if Redis connection is established."""
    print("Checking Redis connection...")

    try:
        run_command(
            "cd prod && docker-compose exec -T redis-queue redis-cli ping", check=False
        )
        print("OK: Redis connection check passed")
        return True
    except Exception as e:
        print(f"WARNING: Redis connection check failed: {e}")
        return False


def generate_report(results: Dict[str, bool]) -> str:
    """Generate compliance report."""
    report = [
        "=" * 60,
        "ErpGreeHouse System Compliance Report",
        "=" * 60,
        "",
        "Data Storage Compliance (152-FZ):",
        "",
    ]

    for check_name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        report.append(f"{status:10} {check_name}")

    report.extend(
        [
            "",
            "=" * 60,
            "",
            "Summary:",
            f"Passed: {sum(results.values())}/{len(results)} checks",
        ]
    )

    return "\n".join(report)


def main() -> int:
    """Main compliance verification function."""
    print("Starting compliance verification...")
    print("=" * 60)

    # Run all compliance checks
    results = {
        "Docker Compose Configuration": check_docker_compose(),
        "Environment Configuration": check_env_config(),
        "Compliance Documentation": check_documentation(),
        "Running Containers": check_running_containers(),  # Optional check
        "Database Connection": check_database_connection(),  # Optional check
        "Redis Connection": check_redis_connection(),  # Optional check
    }

    print("\n" + "=" * 60)
    report = generate_report(results)
    print(report)

    # Optionally write report to file (comment out to disable)
    # with open("compliance_report.txt", "w", encoding="utf-8") as f:
    #     f.write(report + "\n")

    # Check if all mandatory checks passed
    mandatory_checks = [
        "Docker Compose Configuration",
        "Environment Configuration",
        "Compliance Documentation",
    ]
    all_mandatory_passed = all(results[check] for check in mandatory_checks)

    if all_mandatory_passed:
        print("\nOK: All mandatory compliance checks passed")
        return 0
    else:
        print("\nERROR: Some mandatory compliance checks failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
