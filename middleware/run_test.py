#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import io
import subprocess
import sys

# Set output encoding to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

try:
    result = subprocess.run(
        [
            "python",
            "-m",
            "pytest",
            "tests/unit/test_consent_flow.py::test_store_consent_with_type",
            "-v",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )

    print("STDOUT:")
    print(result.stdout)
    print("\nSTDERR:")
    print(result.stderr)
    print(f"\nReturn Code: {result.returncode}")

except Exception as e:
    print(f"Error: {e}")
    import traceback

    print(traceback.format_exc())
