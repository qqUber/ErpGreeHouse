import hashlib
import secrets


def hash_password(password: str, salt: str, iterations: int) -> str:
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
        dklen=32,
    )
    return dk.hex()


def new_salt() -> str:
    return secrets.token_urlsafe(16)


def constant_time_equals(a: str, b: str) -> bool:
    return secrets.compare_digest(a.encode("utf-8"), b.encode("utf-8"))
