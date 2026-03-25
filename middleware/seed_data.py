#!/usr/bin/env python3
"""Compatibility wrapper for manual database initialization.

The single source of truth for seeding lives in :mod:`app.db_init`.
This module remains only so older scripts still resolve, but it does not
duplicate any seeding logic.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db_init import main as db_init_main


def main() -> int:
    return db_init_main()


if __name__ == "__main__":
    sys.exit(main())
