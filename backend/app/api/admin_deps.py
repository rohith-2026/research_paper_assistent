import os
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from bson import ObjectId

from app.core.config import settings
from app.repositories.admin_user_repo import AdminUserRepo
from app.repositories.admin_auth_session_repo import AdminAuthSessionRepo
from app.core.security import now_utc


bearer_scheme = HTTPBearer(auto_error=True)

_TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "0") == "1"

def _client_ip(request: Request) -> str:
    ip = None
    if _TRUST_PROXY_HEADERS:
        fwd = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
        if fwd:
            ip = fwd.split(",")[0].strip()
    if not ip:
        ip = request.client.host if request.client else "unknown"
    return ip


async def get_current_admin(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = creds.credentials
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": False},
        )
        token_type = payload.get("type")
        if token_type and token_type not in {"admin_access", "access"}:
            raise HTTPException(status_code=401, detail=f"ADMIN Invalid token type: {token_type}")
        admin_id = payload.get("sub")
        session_id = payload.get("sid")
        if not admin_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=401, detail="Invalid token identifiers")

    admin_repo = AdminUserRepo()
    admin = await admin_repo.get_by_id(ObjectId(admin_id))
    if not admin or not admin.get("is_active", True):
        raise HTTPException(status_code=401, detail="Admin not found")

    # IP allowlist check if configured
    db = admin_repo._db
    allowlist = await db["admin_ip_allowlist"].find({"admin_id": ObjectId(admin_id)}).to_list(50)
    if allowlist:
        ip = _client_ip(request)
        allowed = any(a.get("ip") == ip for a in allowlist)
        if not allowed:
            raise HTTPException(status_code=403, detail="IP not allowed")

    if session_id and ObjectId.is_valid(session_id):
        sessions = AdminAuthSessionRepo()
        session = await sessions.find_one(
            {"_id": ObjectId(session_id), "admin_id": ObjectId(admin_id), "revoked": False}
        )
        if session:
            await sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"last_seen_at": now_utc()}},
            )

    admin["id"] = str(admin["_id"])
    admin["session_id"] = str(session["_id"])
    return admin
