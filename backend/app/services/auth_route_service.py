from datetime import timedelta
import secrets
import hashlib

from app.core.config import settings
from app.core.security import (
    now_utc,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
)
from app.repositories.user_repo import UserRepo
from app.repositories.admin_settings_repo import AdminSettingsRepo
from app.repositories.refresh_token_repo import RefreshTokenRepo
from app.repositories.password_reset_repo import PasswordResetRepo
from app.services.auth_service import AuthService


class AuthRouteService:
    """
    Route-aligned auth behavior to preserve responses.
    """

    def __init__(self, db=None):
        self.users = UserRepo(db=db)
        self.refresh_tokens = RefreshTokenRepo(db=db)
        self.password_resets = PasswordResetRepo(db=db)
        self.core = AuthService(db=db)
        self.settings = AdminSettingsRepo(db=db)

    @staticmethod
    def _hash_reset_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    async def register(self, name: str, email: str, password: str) -> dict:
        settings_doc = await self.settings.find_one({"_id": "global"}) or {}
        if settings_doc.get("maintenance_mode") or settings_doc.get("signups_enabled") is False:
            raise ValueError("Signups disabled")
        existing = await self.users.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        doc = {
            "name": name,
            "email": email,
            "password_hash": hash_password(password),
            "role": "user",
            "is_verified": False,
            "created_at": now_utc(),
            "updated_at": now_utc(),
            "last_login_at": None,
        }
        res = await self.users.insert(doc)
        return {"message": "Registered successfully", "user_id": str(res.inserted_id)}

    async def login(self, email: str, password: str, user_agent: str | None = None, ip: str | None = None) -> dict:
        user = await self.users.get_by_email(email)
        if not user or not verify_password(password, user["password_hash"]):
            raise ValueError("Invalid email or password")

        await self.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login_at": now_utc(), "updated_at": now_utc()}},
        )

        access_token = create_access_token(
            {"sub": str(user["_id"]), "email": user["email"], "role": user["role"]}
        )
        refresh_token = create_refresh_token()

        await self.refresh_tokens.insert(
            {
                "user_id": user["_id"],
                "token_hash": hash_token(refresh_token),
                "created_at": now_utc(),
                "expires_at": now_utc() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                "revoked": False,
                "revoked_at": None,
                "user_agent": user_agent,
                "ip": ip,
            }
        )

        return {"access_token": access_token, "refresh_token": refresh_token}

    async def refresh(self, refresh_token: str) -> dict:
        session = await self.refresh_tokens.find_one(
            {"token_hash": hash_token(refresh_token), "revoked": False}
        )
        if not session:
            raise ValueError("Invalid refresh token")

        user = await self.users.get_by_id(session["user_id"])
        if not user:
            raise ValueError("User not found")

        new_access = create_access_token(
            {"sub": str(user["_id"]), "email": user["email"], "role": user["role"]}
        )

        new_refresh = create_refresh_token()
        await self.refresh_tokens.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "token_hash": hash_token(new_refresh),
                    "created_at": now_utc(),
                    "expires_at": now_utc() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                }
            },
        )

        return {"access_token": new_access, "refresh_token": new_refresh}

    async def logout(self, refresh_token: str) -> dict:
        res = await self.refresh_tokens.update_one(
            {"token_hash": hash_token(refresh_token), "revoked": False},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        if res.modified_count == 0:
            return {"revoked": False}
        return {"revoked": True}

    async def logout_all(self, user_id: str) -> dict:
        return await self.core.logout_all(user_id)

    async def forgot_password(self, email: str) -> dict:
        user = await self.users.get_by_email(email)
        if not user:
            return {"message": "If the email exists, a reset link has been sent."}

        reset_token = secrets.token_urlsafe(48)
        reset_hash = self._hash_reset_token(reset_token)

        await self.password_resets.insert(
            {
                "user_id": user["_id"],
                "reset_token_hash": reset_hash,
                "created_at": now_utc(),
                "expires_at": now_utc() + timedelta(minutes=15),
                "used": False,
                "used_at": None,
            }
        )

        return {
            "message": "Reset token generated (DEV MODE).",
            "reset_token": reset_token,
            "expires_in_minutes": 15,
        }

    async def reset_password(self, reset_token: str, new_password: str) -> dict:
        reset_hash = self._hash_reset_token(reset_token)

        reset_doc = await self.password_resets.get_by_reset_hash_unused(reset_hash)
        if not reset_doc:
            raise ValueError("Invalid or already used reset token")

        if reset_doc["expires_at"] < now_utc():
            raise ValueError("Reset token expired. Generate again.")

        await self.users.update_one(
            {"_id": reset_doc["user_id"]},
            {"$set": {"password_hash": hash_password(new_password), "updated_at": now_utc()}},
        )

        await self.password_resets.update_one(
            {"_id": reset_doc["_id"]},
            {"$set": {"used": True, "used_at": now_utc()}},
        )

        return {"message": "Password reset successful"}

    async def account_usage(self, user_id: str) -> dict:
        return await self.core.account_usage(user_id)

    async def export_data(self, user_id: str) -> dict:
        return await self.core.export_data(user_id)

    async def update_preferences(self, user_id: str, analytics_opt_out: bool | None = None) -> dict:
        return await self.core.update_preferences(user_id, analytics_opt_out=analytics_opt_out)

    async def delete_account(self, user_id: str) -> dict:
        return await self.core.delete_account(user_id)

    async def delete_account_data(self, user_id: str) -> dict:
        return await self.core.delete_account_data(user_id)
