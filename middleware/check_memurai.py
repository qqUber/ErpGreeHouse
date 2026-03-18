import socket
import sys


def check_redis(host="127.0.0.1", port=6379):
    print(f"Connecting to Redis (Memurai) at {host}:{port}...")
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2)
        s.connect((host, port))
        s.send(b"PING\r\n")
        response = s.recv(1024)
        s.close()
        if b"PONG" in response:
            print("SUCCESS: Redis PONG received.")
            return True
        else:
            print(f"FAILURE: Unexpected response: {response}")
            return False
    except Exception as e:
        print(f"FAILURE: Connection error: {e}")
        return False


if __name__ == "__main__":
    if check_redis():
        sys.exit(0)
    else:
        sys.exit(1)
