import os
import sys

# Add the current directory to sys.path so we can import 'app'
sys.path.append(os.getcwd())

from app.security import hash_password
from app.db import get_db

def reset_password():
    print("Resetting passwords for all users...")
    
    users = [
        ("admin", "admin"),
        ("operator", "operator"),
        ("manager", "manager")
    ]
    
    db = get_db()
    conn = db.connect()
    try:
        for username, password in users:
            print(f"Processing user: {username}")
            row = conn.execute(
                "SELECT id, password_salt, password_iter FROM admin_users WHERE username=?",
                (username,),
            ).fetchone()
            
            if not row:
                print(f"User '{username}' NOT FOUND.")
                continue
                
            user_id = row[0]
            salt = str(row[1])
            iterations = int(row[2])
            
            new_hash = hash_password(password, salt=salt, iterations=iterations)
            
            conn.execute(
                "UPDATE admin_users SET password_hash=? WHERE id=?",
                (new_hash, user_id),
            )
            print(f"Password for '{username}' updated successfully.")
            
        conn.commit()
        return True
            
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    if reset_password():
        sys.exit(0)
    else:
        sys.exit(1)
