#!/usr/bin/env python3
"""Initialize test database for E2E tests."""

import os
import sys

from app.admin_auth_api import _bootstrap_default_admin, _bootstrap_demo_users
from app.db import init_db


def main():
    db_path = "/app/data/test_telegram_crm.db"

    # Ensure clean state
    if os.path.exists(db_path):
        os.remove(db_path)

    os.environ["CRM_DB_PATH"] = db_path

    init_db()
    _bootstrap_default_admin()
    _bootstrap_demo_users()

    print(f"Database {db_path} initialized successfully")
    return 0


if __name__ == "__main__":
    sys.exit(main())
