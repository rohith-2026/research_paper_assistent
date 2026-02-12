import hashlib
from datetime import timedelta
from typing import Any, Dict
import secrets

from bson import ObjectId
from fastapi import HTTPException

from app.core.security import verify_password, create_admin_access_token, now_utc
from app.core.security import hash_password
from app.core.config import settings
from app.repositories.admin_user_repo import AdminUserRepo
from app.repositories.admin_auth_session_repo import AdminAuthSessionRepo
from app.repositories.admin_audit_repo import AdminAuditRepo


class AdminAuthService:
    def __init__(self, db=None):
        self.admins = AdminUserRepo(db=db)
        self.sessions = AdminAuthSessionRepo(db=db)
        self.audit = AdminAuditRepo(db=db)
        self._db = db if db is not None else self.admins._db
        self.preferences = self._db["admin_preferences"]
        self.api_keys = self._db["admin_api_keys"]
        self.mfa = self._db["admin_mfa"]
        self.ip_allowlist = self._db["admin_ip_allowlist"]

    @staticmethod
    def _hash_token(raw: str) -> str:
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def login(self, email: str, password: str, user_agent: str | None, ip: str | None) -> Dict[str, Any]:
        email = (email or "").strip().lower()
        admin = await self.admins.get_by_email(email)
        if not admin or not verify_password(password, admin.get("password_hash", "")):
            raise ValueError("Invalid email or password")
        if not admin.get("is_active", True):
            raise ValueError("Account disabled")

        await self.admins.update_one(
            {"_id": admin["_id"]},
            {"$set": {"last_login_at": now_utc(), "updated_at": now_utc()}},
        )

        expire_minutes = getattr(settings, "ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES", 0)
        session_doc = {
            "admin_id": admin["_id"],
            "created_at": now_utc(),
            "last_seen_at": now_utc(),
            "revoked": False,
            "revoked_at": None,
            "user_agent": user_agent,
            "ip": ip,
            "expires_at": now_utc() + timedelta(minutes=expire_minutes) if expire_minutes and expire_minutes > 0 else None,
        }
        res = await self.sessions.insert(session_doc)
        session_id = res.inserted_id

        token = create_admin_access_token({"sub": str(admin["_id"]), "sid": str(session_id)})

        await self.audit.insert(
            {
                "admin_id": admin["_id"],
                "action": "login",
                "meta": {"ip": ip, "user_agent": user_agent},
                "created_at": now_utc(),
            }
        )

        return {"access_token": token, "admin_id": str(admin["_id"])}

    async def logout(self, admin_id: str, session_id: str) -> Dict[str, Any]:
        if not ObjectId.is_valid(admin_id) or not ObjectId.is_valid(session_id):
            raise ValueError("Invalid identifiers")
        res = await self.sessions.update_one(
            {"_id": ObjectId(session_id), "admin_id": ObjectId(admin_id)},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": res.modified_count == 1}

    async def list_sessions(self, admin_id: str) -> list[dict]:
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        rows = await self.sessions.col.find(
            {"admin_id": ObjectId(admin_id)}
        ).sort("created_at", -1).to_list(None)
        for r in rows:
            r["id"] = str(r.pop("_id"))
            r["admin_id"] = str(r["admin_id"])
        return rows

    async def revoke_session(self, admin_id: str, session_id: str) -> Dict[str, Any]:
        if not ObjectId.is_valid(admin_id) or not ObjectId.is_valid(session_id):
            raise ValueError("Invalid identifiers")
        res = await self.sessions.update_one(
            {"_id": ObjectId(session_id), "admin_id": ObjectId(admin_id)},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": res.modified_count == 1}

    async def get_profile(self, admin_id: str) -> dict:
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        admin = await self.admins.get_by_id(ObjectId(admin_id))
        if not admin:
            raise ValueError("Admin not found")
        prefs = await self.preferences.find_one({"admin_id": ObjectId(admin_id)}) or {}
        mfa = await self.mfa.find_one({"admin_id": ObjectId(admin_id)}) or {}
        keys = await self.api_keys.find({"admin_id": ObjectId(admin_id)}).sort("created_at", -1).to_list(50)
        key_out = []
        for k in keys:
            key_out.append(
                {
                    "id": str(k.get("_id")),
                    "name": k.get("name"),
                    "prefix": k.get("prefix"),
                    "created_at": k.get("created_at"),
                    "revoked": k.get("revoked", False),
                    "last_used_at": k.get("last_used_at"),
                }
            )
        return {
            "profile": {
                "id": str(admin.get("_id")),
                "email": admin.get("email"),
                "role": admin.get("role", "admin"),
                "last_login_at": admin.get("last_login_at"),
                "is_active": admin.get("is_active", True),
            },
            "preferences": {
                "theme": prefs.get("theme", "system"),
                "notifications": prefs.get("notifications", True),
                "audit_logging": prefs.get("audit_logging", True),
                "audit_events": prefs.get("audit_events", ["login", "settings", "users", "compliance"]),
            },
            "mfa": {
                "enabled": bool(mfa.get("enabled", False)),
                "updated_at": mfa.get("updated_at"),
            },
            "api_keys": key_out,
        }

    async def update_preferences(self, admin_id: str, payload: dict) -> dict:
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        updates = {}
        if "theme" in payload:
            updates["theme"] = payload.get("theme")
        if "notifications" in payload:
            updates["notifications"] = bool(payload.get("notifications"))
        if "audit_logging" in payload:
            updates["audit_logging"] = bool(payload.get("audit_logging"))
        if "audit_events" in payload:
            updates["audit_events"] = payload.get("audit_events") or []
        updates["updated_at"] = now_utc()
        await self.preferences.update_one(
            {"admin_id": ObjectId(admin_id)},
            {"$set": updates},
            upsert=True,
        )
        return {"updated": True}

    async def create_api_key(self, admin_id: str, name: str | None = None) -> dict:
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        raw = secrets.token_urlsafe(32)
        prefix = raw[:6]
        hashed = self._hash_token(raw)
        doc = {
            "admin_id": ObjectId(admin_id),
            "name": name or "API Key",
            "prefix": prefix,
            "hash": hashed,
            "created_at": now_utc(),
            "revoked": False,
        }
        res = await self.api_keys.insert_one(doc)
        return {"id": str(res.inserted_id), "key": raw, "prefix": prefix}

    async def revoke_api_key(self, admin_id: str, key_id: str) -> dict:
        if not ObjectId.is_valid(admin_id) or not ObjectId.is_valid(key_id):
            raise ValueError("Invalid identifiers")
        res = await self.api_keys.update_one(
            {"_id": ObjectId(key_id), "admin_id": ObjectId(admin_id)},
            {"$set": {"revoked": True, "revoked_at": now_utc()}},
        )
        return {"revoked": res.modified_count == 1}

    async def enable_mfa(self, admin_id: str) -> dict:
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        codes = [secrets.token_hex(4) for _ in range(5)]
        hashed = [self._hash_token(c) for c in codes]
        await self.mfa.update_one(
            {"admin_id": ObjectId(admin_id)},
            {"$set": {"enabled": True, "backup_codes": hashed, "updated_at": now_utc()}},
            upsert=True,
        )
        return {"enabled": True, "backup_codes": codes}

    async def disable_mfa(self, admin_id: str) -> dict:
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        await self.mfa.update_one(
            {"admin_id": ObjectId(admin_id)},
            {"$set": {"enabled": False, "backup_codes": [], "updated_at": now_utc()}},
            upsert=True,
        )
        return {"enabled": False}

    async def reset_password(self, admin_id: str, new_password: str) -> dict:
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        if not new_password or len(new_password) < 8:
            raise ValueError("Password must be at least 8 characters")
        await self.admins.update_one(
            {"_id": ObjectId(admin_id)},
            {"$set": {"password_hash": hash_password(new_password), "updated_at": now_utc()}},
        )
        return {"updated": True}

    async def login_history(self, admin_id: str, days: int = 30) -> list[dict]:
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        start = now_utc() - timedelta(days=days)
        pipeline = [
            {"$match": {"admin_id": ObjectId(admin_id), "action": "login", "created_at": {"$gte": start}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        rows = await self.audit.col.aggregate(pipeline).to_list(None)
        return [{"date": r["_id"], "count": r["count"]} for r in rows]

    async def list_ip_allowlist(self, admin_id: str):
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        rows = await self.ip_allowlist.find({"admin_id": ObjectId(admin_id)}).sort("created_at", -1).to_list(50)
        return [
            {
                "id": str(r.get("_id")),
                "ip": r.get("ip"),
                "label": r.get("label"),
                "created_at": r.get("created_at"),
            }
            for r in rows
        ]

    async def add_ip_allowlist(self, admin_id: str, ip: str, label: str | None = None):
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        if not ip:
            raise ValueError("IP required")
        doc = {
            "admin_id": ObjectId(admin_id),
            "ip": ip.strip(),
            "label": label,
            "created_at": now_utc(),
        }
        await self.ip_allowlist.insert_one(doc)
        return {"created": True}

    async def remove_ip_allowlist(self, admin_id: str, entry_id: str):
        if not ObjectId.is_valid(admin_id) or not ObjectId.is_valid(entry_id):
            raise ValueError("Invalid identifiers")
        res = await self.ip_allowlist.delete_one({"_id": ObjectId(entry_id), "admin_id": ObjectId(admin_id)})
        return {"deleted": res.deleted_count == 1}

    async def sudo(self, admin_id: str, password: str) -> dict:
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        admin = await self.admins.get_by_id(ObjectId(admin_id))
        if not admin or not verify_password(password, admin.get("password_hash", "")):
            raise ValueError("Invalid password")
        ttl_minutes = 15
        await self.sessions.update_one(
            {"admin_id": ObjectId(admin_id), "revoked": False},
            {"$set": {"sudo_until": now_utc() + timedelta(minutes=ttl_minutes)}},
        )
        return {"sudo_until": now_utc() + timedelta(minutes=ttl_minutes)}
