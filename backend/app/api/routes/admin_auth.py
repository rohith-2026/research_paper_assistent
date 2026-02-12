from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.admin_deps import get_current_admin
from app.services.admin_auth_service import AdminAuthService
from app.repositories.admin_audit_repo import AdminAuditRepo

router = APIRouter(prefix="/admin/auth", tags=["AdminAuth"])


@router.post("/login")
async def admin_login(payload: dict, request: Request):
    email = payload.get("email")
    password = payload.get("password")
    service = AdminAuthService()
    try:
        return await service.login(
            email=email,
            password=password,
            user_agent=request.headers.get("user-agent"),
            ip=request.client.host if request.client else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def admin_logout(admin=Depends(get_current_admin)):
    service = AdminAuthService()
    return await service.logout(admin["id"], admin["session_id"])


@router.get("/me")
async def admin_me(admin=Depends(get_current_admin)):
    return {
        "id": admin.get("id"),
        "email": admin.get("email"),
        "role": admin.get("role", "admin"),
        "last_login_at": admin.get("last_login_at"),
    }


@router.get("/profile")
async def admin_profile(admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        profile = await service.get_profile(admin["id"])
        profile["login_history"] = await service.login_history(admin["id"], days=30)
        profile["ip_allowlist"] = await service.list_ip_allowlist(admin["id"])
        return profile
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/preferences")
async def admin_update_preferences(payload: dict, admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.update_preferences(admin["id"], payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api-keys")
async def admin_create_api_key(payload: dict, admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.create_api_key(admin["id"], payload.get("name"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/api-keys/{key_id}")
async def admin_revoke_api_key(key_id: str, admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.revoke_api_key(admin["id"], key_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mfa/enable")
async def admin_enable_mfa(admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.enable_mfa(admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mfa/disable")
async def admin_disable_mfa(admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.disable_mfa(admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reset-password")
async def admin_reset_password(payload: dict, admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.reset_password(admin["id"], payload.get("password") or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sudo")
async def admin_sudo(payload: dict, admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.sudo(admin["id"], payload.get("password") or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ip-allowlist")
async def admin_ip_allowlist(admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.list_ip_allowlist(admin["id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ip-allowlist")
async def admin_add_ip_allowlist(payload: dict, admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.add_ip_allowlist(admin["id"], payload.get("ip"), payload.get("label"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/ip-allowlist/{entry_id}")
async def admin_remove_ip_allowlist(entry_id: str, admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.remove_ip_allowlist(admin["id"], entry_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/security-alerts")
async def admin_security_alerts(admin=Depends(get_current_admin)):
    audit = AdminAuditRepo()
    rows = await audit.col.find({}).sort("created_at", -1).limit(20).to_list(20)
    out = []
    for r in rows:
        out.append(
            {
                "id": str(r.get("_id")),
                "action": r.get("action"),
                "created_at": r.get("created_at"),
                "meta": r.get("meta") or {},
            }
        )
    return out


@router.get("/sessions")
async def admin_sessions(admin=Depends(get_current_admin)):
    service = AdminAuthService()
    return await service.list_sessions(admin["id"])


@router.delete("/sessions/{session_id}")
async def admin_revoke_session(session_id: str, admin=Depends(get_current_admin)):
    service = AdminAuthService()
    try:
        return await service.revoke_session(admin["id"], session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
