import os
import sys

# Add the current directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

from app.db import get_db
from app.security import constant_time_equals, hash_password


def verify_auth():
    print("Verifying auth logic...")

    # Expected default
    username = "admin"
    password = "admin"

    db = get_db()
    conn = db.connect()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, password_salt, password_iter, disabled FROM admin_users WHERE username=?",
            (username,),
        ).fetchone()

        if not row:
            print(f"User '{username}' NOT FOUND in DB.")
            return False

        print(f"User '{username}' found. Verifying password...")

        salt = str(row[3])  # password_salt
        iterations = int(row[4])  # password_iter
        stored_hash = str(row[2])  # password_hash

        print(f"  Salt: {salt}")
        print(f"  Iterations: {iterations}")
        print(f"  Stored Hash: {stored_hash}")

        # Calculate hash with same parameters
        calculated_hash = hash_password(password, salt=salt, iterations=iterations)
        print(f"  Calculated Hash: {calculated_hash}")

        if constant_time_equals(calculated_hash, stored_hash):
            print("SUCCESS: Password matches!")
            return True
        else:
            print("FAILURE: Password does NOT match.")
            return False

    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    if verify_auth():
        sys.exit(0)
    else:
        sys.exit(1)
