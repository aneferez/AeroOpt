from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import get_settings

password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


class TokenError(ValueError):
    pass


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_token(subject: str, token_type: str) -> tuple[str, str, datetime]:
    settings = get_settings()
    now = datetime.now(UTC)
    expires = now + (
        timedelta(minutes=settings.access_token_minutes)
        if token_type == "access"
        else timedelta(days=settings.refresh_token_days)
    )
    jti = str(uuid4())
    payload = {"sub": subject, "type": token_type, "jti": jti, "iat": now, "exp": expires}
    encoded = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return encoded, jti, expires


def decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise TokenError("Invalid or expired token") from exc
    if payload.get("type") != expected_type or not payload.get("sub") or not payload.get("jti"):
        raise TokenError("Invalid token type")
    return payload


def hash_token_id(jti: str) -> str:
    return sha256(jti.encode("utf-8")).hexdigest()
