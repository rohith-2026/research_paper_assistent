from bson import ObjectId

from app.core.security import hash_password, now_utc
from app.repositories.admin_user_repo import AdminUserRepo


class AdminUserService:
    def __init__(self, db=None):
        self.repo = AdminUserRepo(db=db)

    async def list_admins(self, page: int = 1, limit: int = 25):
        skip = max(page - 1, 0) * limit
        rows = await self.repo.col.find({}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        total = await self.repo.col.count_documents({})
        out = []
        for r in rows:
            out.append(
                {
                    "id": str(r["_id"]),
                    "email": r.get("email"),
                    "role": r.get("role", "admin"),
                    "is_active": r.get("is_active", True),
                    "created_at": r.get("created_at"),
                    "last_login_at": r.get("last_login_at"),
                }
            )
        return {"items": out, "page": page, "limit": limit, "total": total}

    async def create_admin(self, email: str, password: str, role: str = "admin"):
        email = (email or "").strip().lower()
        if not email or "@" not in email:
            raise ValueError("Invalid email")
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ValueError("Admin already exists")

        doc = {
            "email": email,
            "password_hash": hash_password(password),
            "role": role,
            "is_active": True,
            "created_at": now_utc(),
            "updated_at": now_utc(),
            "last_login_at": None,
        }
        res = await self.repo.insert(doc)
        doc["id"] = str(res.inserted_id)
        return doc

    async def update_admin(self, admin_id: str, payload: dict):
        if not ObjectId.is_valid(admin_id):
            raise ValueError("Invalid admin id")
        updates = {}
        if "role" in payload:
            updates["role"] = payload["role"]
        if "is_active" in payload:
            updates["is_active"] = bool(payload["is_active"])
        if "password" in payload and payload["password"]:
            if len(payload["password"]) < 8:
                raise ValueError("Password must be at least 8 characters")
            updates["password_hash"] = hash_password(payload["password"])
        if not updates:
            return {"updated": False}

        updates["updated_at"] = now_utc()
        await self.repo.update_one({"_id": ObjectId(admin_id)}, {"$set": updates})
        return {"updated": True}
