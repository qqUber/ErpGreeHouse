import sqlite3
import os
from datetime import datetime

db_path = "crm.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("--- Users ---")
try:
    cursor.execute("SELECT id, username, role, disabled FROM admin_users")
    for row in cursor.fetchall():
        print(dict(row))
except Exception as e:
    print(f"Error reading users: {e}")

print("\n--- Tokens ---")
try:
    cursor.execute("SELECT id, admin_user_id, expires_at FROM admin_tokens ORDER BY id DESC LIMIT 5")
    for row in cursor.fetchall():
        print(dict(row))
except Exception as e:
    print(f"Error reading tokens: {e}")

conn.close()
