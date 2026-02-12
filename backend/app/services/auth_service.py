# app/services/auth_service.py
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from app.core.time_utils import now_ist
from typing import Optional, Dict, Any

from bson import ObjectId

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    now_utc,
)
from app.repositories.user_repo import UserRepo
from app.repositories.refresh_token_repo import RefreshTokenRepo
from app.repositories.password_reset_repo import PasswordResetRepo
from app.repositories.collection_repo import CollectionRepo
from app.repositories.collection_item_repo import CollectionItemRepo
from app.repositories.query_repo import QueryRepo
from app.repositories.paper_repo import PaperRepo
from app.repositories.summary_repo import SummaryRepository
from app.repositories.note_repo import NoteRepo
from app.repositories.download_repo import DownloadRepo
from app.repositories.chat_repo import ChatSessionRepo, ChatMessageRepo
from app.repositories.analytics_event_repo import AnalyticsEventRepo
from app.repositories.api_usage_repo import ApiUsageRepo
from app.repositories.feedback_repo import FeedbackRepo
from app.repositories.admin_session_repo import AdminSessionRepo
from app.db.mongo import get_db


class AuthService:
    """
    Auth service for:
      - register/login
      - refresh access token
      - logout / logout-all
      - forgot/reset password
    Uses repositories:
      users
      refresh_tokens
      password_resets
    """

    # ---------------------------
    # Helpers
    # ---------------------------
    @staticmethod
    def _refresh_token_hash(raw: str) -> str:
        # store hash only (never store raw refresh token)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @staticmethod
    def _gen_refresh_token() -> str:
        return secrets.token_urlsafe(48)

    @staticmethod
    def _gen_reset_token() -> str:
        return secrets.token_urlsafe(32)

    # ---------------------------
    # Register
    # ---------------------------
    def __init__(self, db=None):
        self.users = UserRepo(db=db)
        self.refresh_tokens = RefreshTokenRepo(db=db)
        self.password_resets = PasswordResetRepo(db=db)
        self._db = db if db is not None else get_db()

    async def register(self, name: str, email: str, password: str) -> Dict[str, Any]:
        email = (email or "").strip().lower()
        if not email or "@" not in email:
            raise ValueError("Invalid email")
        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters")

        existing = await self.users.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        user_doc = {
            "name": (name or "").strip(),
            "email": email,
            "password_hash": hash_password(password),
            "created_at": now_utc(),
            "updated_at": now_utc(),
            "is_active": True,
            "analytics_opt_out": False,
            "last_login_at": now_utc(),
        }

        res = await self.users.insert(user_doc)
        user_id = res.inserted_id

        access_token = create_access_token({"sub": str(user_id)})
        refresh_token = await self._issue_refresh_token(user_id)

        return {
            "user_id": str(user_id),
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    # ---------------------------
    # Login
    # ---------------------------
    async def login(self, email: str, password: str) -> Dict[str, Any]:
        email = (email or "").strip().lower()
        user = await self.users.get_by_email(email)

        if not user:
            raise ValueError("Invalid email or password")

        if not user.get("is_active", True):
            raise ValueError("Account disabled")

        if not verify_password(password, user.get("password_hash", "")):
            raise ValueError("Invalid email or password")

        user_id = user["_id"]

        await self.users.update_one(
            {"_id": user_id},
            {"$set": {"last_login_at": now_utc(), "updated_at": now_utc()}},
        )

        access_token = create_access_token({"sub": str(user_id)})
        refresh_token = await self._issue_refresh_token(user_id)

        return {
            "user_id": str(user_id),
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    # ---------------------------
    # Refresh Token Flow
    # ---------------------------
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Validate refresh token in DB and create new access token.
        """
        refresh_token = (refresh_token or "").strip()
        if not refresh_token:
            raise ValueError("Missing refresh token")

        token_hash = self._refresh_token_hash(refresh_token)

        token_doc = await self.refresh_tokens.get_by_hash(token_hash)
        if not token_doc:
            raise ValueError("Invalid refresh token")

        # expiry
        expires_at: datetime = token_doc["expires_at"]
        if expires_at <= now_utc():
            # delete expired token
            await self.refresh_tokens.delete_one({"_id": token_doc["_id"]})
            raise ValueError("Refresh token expired")

        user_id = token_doc["user_id"]
        access_token = create_access_token({"sub": str(user_id)})

        return {
            "access_token": access_token,
            "user_id": str(user_id),
        }

    async def logout(self, refresh_token: str) -> Dict[str, Any]:
        """
        Revoke one refresh token session.
        """
        refresh_token = (refresh_token or "").strip()
        if not refresh_token:
            return {"revoked": False}

        token_hash = self._refresh_token_hash(refresh_token)
        res = await self.refresh_tokens.delete_by_hash(token_hash)

        return {"revoked": res.deleted_count == 1}

    async def logout_all(self, user_id: str) -> Dict[str, Any]:
        """
        Revoke all refresh tokens for this user.
        """
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")

        uid = ObjectId(user_id)
        res = await self.refresh_tokens.delete_by_user(uid)
        return {"revoked_all": True, "count": res.deleted_count}

    # ---------------------------
    # Forgot Password
    # ---------------------------
    async def create_password_reset(self, email: str) -> Dict[str, Any]:
        """
        Creates password reset token in DB (TTL index should delete later).
        You will later connect it to email sending.
        """
        email = (email or "").strip().lower()
        user = await self.users.get_by_email(email)
        if not user:
            # don't leak existence
            return {"ok": True}

        uid = user["_id"]

        raw_token = self._gen_reset_token()
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

        expires_at = now_utc() + timedelta(minutes=30)

        await self.password_resets.insert(
            {
                "user_id": uid,
                "token_hash": token_hash,
                "expires_at": expires_at,
                "created_at": now_utc(),
            }
        )

        # In production: email raw_token to user
        return {"ok": True, "reset_token": raw_token}

    async def reset_password(self, token: str, new_password: str) -> Dict[str, Any]:
        token = (token or "").strip()
        if not token:
            raise ValueError("Missing token")
        if not new_password or len(new_password) < 6:
            raise ValueError("Password must be at least 6 characters")

        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

        doc = await self.password_resets.get_by_token_hash(token_hash)
        if not doc:
            raise ValueError("Invalid or expired token")

        expires_at: datetime = doc["expires_at"]
        if expires_at <= now_utc():
            await self.password_resets.delete_one({"_id": doc["_id"]})
            raise ValueError("Token expired")

        uid = doc["user_id"]

        await self.users.update_one(
            {"_id": uid},
            {
                "$set": {
                    "password_hash": hash_password(new_password),
                    "updated_at": now_utc(),
                }
            },
        )

        # delete this reset token
        await self.password_resets.delete_one({"_id": doc["_id"]})

        # revoke all refresh tokens after password reset
        await self.refresh_tokens.delete_by_user(uid)

        return {"ok": True}

    async def update_preferences(self, user_id: str, analytics_opt_out: Optional[bool] = None) -> Dict[str, Any]:
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")
        updates: dict[str, Any] = {"updated_at": now_utc()}
        if analytics_opt_out is not None:
            updates["analytics_opt_out"] = bool(analytics_opt_out)
        if len(updates) == 1:
            return {"updated": False}
        await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates},
        )
        return {"updated": True, "analytics_opt_out": updates.get("analytics_opt_out")}

    async def account_usage(self, user_id: str) -> Dict[str, Any]:
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")
        uid = ObjectId(user_id)
        db = self._db

        collections = CollectionRepo(db=db)
        collection_items = CollectionItemRepo(db=db)
        queries = QueryRepo(db=db)
        papers = PaperRepo(db=db)
        summaries = SummaryRepository(db=db)
        notes = NoteRepo(db=db)
        downloads = DownloadRepo(db=db)
        chat_sessions = ChatSessionRepo(db=db)
        chat_messages = ChatMessageRepo(db=db)
        feedback = FeedbackRepo(db=db)

        user_collections = await collections.col.find(
            {"user_id": uid},
            {"_id": 1},
        ).to_list(length=None)
        collection_ids = [c["_id"] for c in user_collections]

        async def safe_count(repo, query) -> int:
            try:
                return await repo.count(query)
            except Exception:
                return 0

        collection_items_count = (
            await safe_count(collection_items, {"collection_id": {"$in": collection_ids}})
            if collection_ids
            else 0
        )
        counts = {
            "collections": len(collection_ids),
            "collection_items": collection_items_count,
            "queries": await safe_count(queries, {"user_id": uid}),
            "papers": await safe_count(papers, {"user_id": uid}),
            "summaries": await safe_count(summaries, {"user_id": uid}),
            "notes": await safe_count(notes, {"user_id": uid}),
            "downloads": await safe_count(downloads, {"user_id": uid}),
            "chat_sessions": await safe_count(chat_sessions, {"user_id": uid}),
            "chat_messages": await safe_count(chat_messages, {"user_id": uid}),
            "feedback": await safe_count(feedback, {"user_id": uid}),
        }
        total_records = sum(counts.values())
        user = await self.users.get_by_id(uid)
        return {
            "counts": counts,
            "total_records": total_records,
            "last_login_at": user.get("last_login_at") if user else None,
        }

    def _serialize_value(self, value: Any) -> Any:
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, list):
            return [self._serialize_value(v) for v in value]
        if isinstance(value, dict):
            return {k: self._serialize_value(v) for k, v in value.items()}
        return value

    async def export_data(self, user_id: str) -> Dict[str, Any]:
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")
        uid = ObjectId(user_id)
        db = self._db

        collections = CollectionRepo(db=db)
        collection_items = CollectionItemRepo(db=db)
        queries = QueryRepo(db=db)
        papers = PaperRepo(db=db)
        summaries = SummaryRepository(db=db)
        notes = NoteRepo(db=db)
        downloads = DownloadRepo(db=db)
        chat_sessions = ChatSessionRepo(db=db)
        chat_messages = ChatMessageRepo(db=db)
        feedback = FeedbackRepo(db=db)

        user_doc = await self.users.get_by_id(uid)
        user_collections = await collections.col.find({"user_id": uid}).to_list(length=None)
        collection_ids = [c["_id"] for c in user_collections]
        items = await collection_items.col.find(
            {"collection_id": {"$in": collection_ids}} if collection_ids else {"_id": None}
        ).to_list(length=None)

        data = {
            "profile": self._serialize_value(user_doc or {}),
            "collections": self._serialize_value(user_collections),
            "collection_items": self._serialize_value(items),
            "queries": self._serialize_value(await queries.col.find({"user_id": uid}).to_list(length=None)),
            "papers": self._serialize_value(await papers.col.find({"user_id": uid}).to_list(length=None)),
            "summaries": self._serialize_value(await summaries.col.find({"user_id": uid}).to_list(length=None)),
            "notes": self._serialize_value(await notes.col.find({"user_id": uid}).to_list(length=None)),
            "downloads": self._serialize_value(await downloads.col.find({"user_id": uid}).to_list(length=None)),
            "chat_sessions": self._serialize_value(await chat_sessions.col.find({"user_id": uid}).to_list(length=None)),
            "chat_messages": self._serialize_value(await chat_messages.col.find({"user_id": uid}).to_list(length=None)),
            "feedback": self._serialize_value(await feedback.col.find({"user_id": uid}).to_list(length=None)),
            "exported_at": now_ist().isoformat(),
        }
        return data

    async def delete_account_data(self, user_id: str) -> Dict[str, Any]:
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")

        uid = ObjectId(user_id)
        db = self._db

        collections = CollectionRepo(db=db)
        collection_items = CollectionItemRepo(db=db)
        queries = QueryRepo(db=db)
        papers = PaperRepo(db=db)
        summaries = SummaryRepository(db=db)
        notes = NoteRepo(db=db)
        downloads = DownloadRepo(db=db)
        chat_sessions = ChatSessionRepo(db=db)
        chat_messages = ChatMessageRepo(db=db)
        analytics_events = AnalyticsEventRepo(db=db)
        api_usage = ApiUsageRepo(db=db)
        feedback = FeedbackRepo(db=db)
        admin_sessions = AdminSessionRepo(db=db)

        user_collections = await collections.col.find(
            {"user_id": uid},
            {"_id": 1},
        ).to_list(length=None)
        collection_ids = [c["_id"] for c in user_collections]
        if collection_ids:
            await collection_items.delete_many({"collection_id": {"$in": collection_ids}})

        await collections.delete_many({"user_id": uid})
        await queries.delete_many({"user_id": uid})
        await papers.delete_many({"user_id": uid})
        await summaries.delete_many({"user_id": uid})
        await notes.delete_many({"user_id": uid})
        await downloads.delete_many({"user_id": uid})
        await chat_messages.delete_many({"user_id": uid})
        await chat_sessions.delete_many({"user_id": uid})
        await analytics_events.delete_many({"user_id": uid})
        await api_usage.delete_many({"user_id": uid})
        await feedback.delete_many({"user_id": uid})
        await admin_sessions.delete_many({"user_id": uid})
        await self.password_resets.delete_many({"user_id": uid})
        await self.refresh_tokens.delete_by_user(uid)

        await self.users.update_one(
            {"_id": uid},
            {"$set": {"updated_at": now_utc()}},
        )

        return {"deleted_data": True}
    async def delete_account(self, user_id: str) -> Dict[str, Any]:
        if not ObjectId.is_valid(user_id):
            raise ValueError("Invalid user id")

        uid = ObjectId(user_id)
        db = self._db

        collections = CollectionRepo(db=db)
        collection_items = CollectionItemRepo(db=db)
        queries = QueryRepo(db=db)
        papers = PaperRepo(db=db)
        summaries = SummaryRepository(db=db)
        notes = NoteRepo(db=db)
        downloads = DownloadRepo(db=db)
        chat_sessions = ChatSessionRepo(db=db)
        chat_messages = ChatMessageRepo(db=db)
        analytics_events = AnalyticsEventRepo(db=db)
        api_usage = ApiUsageRepo(db=db)
        feedback = FeedbackRepo(db=db)
        admin_sessions = AdminSessionRepo(db=db)

        # Clean up dependent data first
        user_collections = await collections.col.find(
            {"user_id": uid},
            {"_id": 1},
        ).to_list(length=None)
        collection_ids = [c["_id"] for c in user_collections]
        if collection_ids:
            await collection_items.delete_many({"collection_id": {"$in": collection_ids}})

        await collections.delete_many({"user_id": uid})
        await queries.delete_many({"user_id": uid})
        await papers.delete_many({"user_id": uid})
        await summaries.delete_many({"user_id": uid})
        await notes.delete_many({"user_id": uid})
        await downloads.delete_many({"user_id": uid})
        await chat_messages.delete_many({"user_id": uid})
        await chat_sessions.delete_many({"user_id": uid})
        await analytics_events.delete_many({"user_id": uid})
        await api_usage.delete_many({"user_id": uid})
        await feedback.delete_many({"user_id": uid})
        await admin_sessions.delete_many({"user_id": uid})
        await self.password_resets.delete_many({"user_id": uid})
        await self.refresh_tokens.delete_by_user(uid)

        res = await self.users.delete_one({"_id": uid})
        return {"deleted": res.deleted_count == 1}

    # ---------------------------
    # Internal: Issue refresh token
    # ---------------------------
    async def _issue_refresh_token(self, user_id: ObjectId) -> str:
        raw = self._gen_refresh_token()
        token_hash = self._refresh_token_hash(raw)

        expires_at = now_utc() + timedelta(days=int(settings.REFRESH_TOKEN_EXPIRE_DAYS))

        await self.refresh_tokens.insert(
            {
                "user_id": user_id,
                "token_hash": token_hash,
                "expires_at": expires_at,
                "created_at": now_utc(),
            }
        )

        return raw
