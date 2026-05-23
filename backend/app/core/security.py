import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.time_utils import now_ist

# Use a dependency-safe default for new hashes and retain support for older
# bcrypt/argon2 hashes that may already exist in the database.
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt", "argon2"],
    deprecated="auto",
)


def now_utc() -> datetime:
    # NOTE: We standardize on IST across the app.
    return now_ist()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(data: Dict[str, Any]) -> str:
    payload = data.copy()
    payload["type"] = "access"
    payload["exp"] = now_utc() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_admin_access_token(data: Dict[str, Any], minutes: int | None = None) -> str:
    payload = data.copy()
    payload["type"] = "admin_access"
    default_minutes = getattr(settings, "ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES", 15)
    expire_minutes = minutes if minutes is not None else default_minutes
    if not expire_minutes or expire_minutes <= 0:
        expire_minutes = 15
    payload["exp"] = now_utc() + timedelta(minutes=expire_minutes)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
