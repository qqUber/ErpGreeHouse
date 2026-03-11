
import sqlite3
import os
from pathlib import Path

# Replicate get_db_path logic
def get_db_path() -> str:
    p = os.getenv("CRM_DB_PATH", "crm.db")
    if os.path.isabs(p):
        return p
    # middleware/app/db.py -> middleware/app -> middleware -> crm.db
    # Assuming script runs from root:
    base = Path(os.getcwd()) / "middleware"
    return str((base / p).resolve())

db_path = get_db_path()
print(f"Checking DB at: {db_path}")

try:
    if not os.path.exists(db_path):
        print(f"File does not exist at {db_path}!")
        # Try finding it in middleware/data/app.db explicitly as a fallback
        alt_path = Path(os.getcwd()) / "middleware" / "data" / "app.db"
        if alt_path.exists():
             print(f"Found alternative DB at: {alt_path}")
             db_path = str(alt_path)
        else:
             print(f"Alternative path {alt_path} also not found.")

    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role, disabled FROM admin_users")
        rows = cursor.fetchall()
        
        print(f"Found {len(rows)} users:")
        for row in rows:
            print(f"ID: {row[0]}, Username: '{row[1]}', Role: '{row[2]}', Disabled: {row[3]}")
            
        conn.close()
except Exception as e:
    print(f"Error: {e}")
