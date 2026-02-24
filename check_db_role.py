
import sqlite3
import os

db_path = r"c:\Users\AASS\IdeaProjects\ErpGreeHouse\middleware\data\app.db"
print(f"Checking DB at: {db_path}")

try:
    if not os.path.exists(db_path):
        print("File does not exist!")
    else:
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
