from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os
import uuid

from app.api.admin_deps import get_current_admin
from app.services.admin_metrics_service import AdminMetricsService
from app.services.admin_settings_service import AdminSettingsService
from app.services.admin_user_service import AdminUserService
from app.repositories.admin_audit_repo import AdminAuditRepo
from app.core.security import now_utc

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard")
async def admin_dashboard(range_days: int = 30, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    return await service.dashboard(range_days=range_days)


@router.get("/analytics")
async def admin_analytics(range_days: int = 30, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    return await service.global_analytics(range_days=range_days)


@router.get("/users")
async def admin_users(
    page: int = 1,
    limit: int = 25,
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    sort_by: str | None = None,
    sort_dir: str | None = None,
    admin=Depends(get_current_admin),
):
    service = AdminMetricsService()
    return await service.list_users(
        page=page,
        limit=limit,
        search=search,
        role=role,
        is_active=is_active,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )


@router.get("/users/{user_id}")
async def admin_user_detail(user_id: str, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        return await service.user_analytics(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}")
async def admin_update_user(user_id: str, payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        return await service.update_user(user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        return await service.delete_user(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/users/{user_id}/data")
async def admin_delete_user_data(user_id: str, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        return await service.delete_user_data(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users/{user_id}/analytics")
async def admin_user_analytics(user_id: str, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        return await service.user_analytics(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api-usage")
async def admin_api_usage(range_days: int = 30, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    return await service.api_usage(range_days=range_days)


@router.get("/feedback")
async def admin_feedback(admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    return await service.feedback_list()


@router.get("/model-performance")
async def admin_model_performance(range_days: int = 14, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    return await service.model_performance(range_days=range_days)


@router.get("/abuse")
async def admin_abuse(admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    return await service.abuse_detection()


@router.patch("/abuse/flags/{flag_id}")
async def admin_update_abuse_flag(flag_id: str, payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        res = await service.update_abuse_flag(flag_id, payload, str(admin.get("_id")))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "update_abuse_flag",
            "meta": {"target": flag_id, "status": payload.get("status")},
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/abuse/block-ip")
async def admin_block_ip(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        res = await service.block_ip(payload.get("ip"), str(admin.get("_id")), payload.get("reason"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "block_ip",
            "meta": {"ip": payload.get("ip")},
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/abuse/flags")
async def admin_create_abuse_flag(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        res = await service.create_abuse_flag(payload, str(admin.get("_id")))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "create_abuse_flag",
            "meta": {"reason": payload.get("reason"), "user_id": payload.get("user_id")},
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/abuse/revoke-sessions/{user_id}")
async def admin_revoke_sessions_for_user(user_id: str, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        res = await service.revoke_user_sessions_by_user(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "revoke_user_sessions",
            "meta": {"user_id": user_id},
            "created_at": now_utc(),
        }
    )
    return res


@router.get("/system-health")
async def admin_system_health(admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    return await service.system_health()


@router.get("/sessions")
async def admin_user_sessions(page: int = 1, limit: int = 50, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    return await service.user_sessions(page=page, limit=limit)


@router.delete("/sessions/{session_id}")
async def admin_revoke_user_session(session_id: str, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        return await service.revoke_user_session(session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/settings")
async def admin_get_settings(admin=Depends(get_current_admin)):
    service = AdminSettingsService()
    return await service.get_settings()


@router.patch("/settings")
async def admin_update_settings(payload: dict, admin=Depends(get_current_admin)):
    service = AdminSettingsService()
    res = await service.update_settings(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "update_settings",
            "meta": {"keys": list(payload.keys())},
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/settings/logout-users")
async def admin_force_logout_users(admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    res = await service.force_logout_users()
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "force_logout_users",
            "meta": res,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/settings/logout-admins")
async def admin_force_logout_admins(admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    res = await service.force_logout_admins()
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "force_logout_admins",
            "meta": res,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/settings/revoke-admin-keys")
async def admin_revoke_admin_keys(admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    res = await service.revoke_all_admin_api_keys()
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "revoke_all_admin_api_keys",
            "meta": res,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/settings/test-email")
async def admin_test_email(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        res = await service.test_email(payload.get("to"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "test_email",
            "meta": {"to": payload.get("to")},
            "created_at": now_utc(),
        }
    )
    return res


@router.get("/admin-users")
async def admin_list_admins(page: int = 1, limit: int = 25, admin=Depends(get_current_admin)):
    service = AdminUserService()
    return await service.list_admins(page=page, limit=limit)


@router.post("/admin-users")
async def admin_create_admin(payload: dict, admin=Depends(get_current_admin)):
    service = AdminUserService()
    try:
        res = await service.create_admin(
            email=payload.get("email"),
            password=payload.get("password"),
            role=payload.get("role") or "admin",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "create_admin",
            "meta": {"email": payload.get("email"), "role": payload.get("role") or "admin"},
            "created_at": now_utc(),
        }
    )
    return res


@router.patch("/admin-users/{admin_id}")
async def admin_update_admin(admin_id: str, payload: dict, admin=Depends(get_current_admin)):
    service = AdminUserService()
    try:
        res = await service.update_admin(admin_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "update_admin",
            "meta": {"target": admin_id, "keys": list(payload.keys())},
            "created_at": now_utc(),
        }
    )
    return res


@router.get("/audit-logs")
async def admin_audit_logs(limit: int = 100, admin=Depends(get_current_admin)):
    audit = AdminAuditRepo()
    rows = await audit.col.find({}).sort("created_at", -1).limit(limit).to_list(limit)
    out = []
    for r in rows:
        out.append(
            {
                "id": str(r["_id"]),
                "admin_id": str(r.get("admin_id")) if r.get("admin_id") else None,
                "action": r.get("action"),
                "meta": r.get("meta") or {},
                "created_at": r.get("created_at"),
            }
        )
    return out


@router.get("/compliance")
async def admin_compliance(admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    return await service.compliance_overview()


@router.post("/compliance/access-review")
async def admin_compliance_access_review(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    res = await service.record_access_review(str(admin.get("_id")), payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_access_review",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/purge-run")
async def admin_compliance_purge_run(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    res = await service.record_purge_run(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_purge_run",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/pii-scan")
async def admin_compliance_pii_scan(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    if payload.get("run") is True:
        res = await service.run_pii_scan(source="manual")
    else:
        res = await service.record_pii_scan(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_pii_scan",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/error-scan")
async def admin_compliance_error_scan(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    if payload.get("run") is True:
        max_lines = int(payload.get("max_lines") or 2000)
        res = await service.run_error_scan(source="manual", max_lines=max_lines)
    else:
        res = await service.record_error_scan(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_error_scan",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/db-scan")
async def admin_compliance_db_scan(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    if payload.get("run") is True:
        res = await service.run_db_scan(source="manual")
    else:
        res = await service.record_db_scan(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_db_scan",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/api-error-scan")
async def admin_compliance_api_error_scan(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    if payload.get("run") is True:
        range_days = int(payload.get("range_days") or 1)
        res = await service.run_api_error_scan(source="manual", range_days=range_days)
    else:
        res = await service.record_api_error_scan(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_api_error_scan",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/frontend-scan")
async def admin_compliance_frontend_scan(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    if payload.get("run") is True:
        res = await service.run_frontend_scan(source="manual")
    else:
        res = await service.record_frontend_scan(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_frontend_scan",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/dependency-scan")
async def admin_compliance_dependency_scan(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    if payload.get("run") is True:
        res = await service.run_dependency_scan(source="manual")
    else:
        res = await service.record_dependency_scan(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_dependency_scan",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/storage-scan")
async def admin_compliance_storage_scan(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    if payload.get("run") is True:
        res = await service.run_storage_scan(source="manual")
    else:
        res = await service.record_storage_scan(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_storage_scan",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/auth-scan")
async def admin_compliance_auth_scan(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    if payload.get("run") is True:
        res = await service.run_auth_scan(source="manual")
    else:
        res = await service.record_auth_scan(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_auth_scan",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.patch("/compliance/badges/{badge_id}")
async def admin_compliance_update_badge(badge_id: str, payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        res = await service.update_compliance_badge(badge_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_update_badge",
            "meta": {"badge_id": badge_id, "status": payload.get("status")},
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/badges")
async def admin_compliance_create_badge(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    res = await service.update_compliance_badge(None, payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_create_badge",
            "meta": {"name": payload.get("name"), "status": payload.get("status")},
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/policy-ack/{policy_id}")
async def admin_compliance_policy_ack(policy_id: str, payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        res = await service.update_policy_ack(policy_id, str(admin.get("_id")), payload.get("acknowledged", True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_policy_ack",
            "meta": {"policy_id": policy_id, "acknowledged": payload.get("acknowledged", True)},
            "created_at": now_utc(),
        }
    )
    return res


@router.post("/compliance/evidence/upload")
async def admin_compliance_upload_evidence(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "compliance")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(upload_dir, name)
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    url = f"/uploads/compliance/{name}"
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_upload_evidence",
            "meta": {"filename": file.filename, "url": url},
            "created_at": now_utc(),
        }
    )
    return {"url": url}


@router.post("/compliance/jobs")
async def admin_compliance_create_job(payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    res = await service.create_compliance_job(payload)
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_job_create",
            "meta": payload,
            "created_at": now_utc(),
        }
    )
    return res


@router.patch("/compliance/jobs/{job_id}")
async def admin_compliance_update_job(job_id: str, payload: dict, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        res = await service.update_compliance_job(job_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    audit = AdminAuditRepo()
    await audit.insert(
        {
            "admin_id": admin.get("_id"),
            "action": "compliance_job_update",
            "meta": {"job_id": job_id, "changes": payload},
            "created_at": now_utc(),
        }
    )
    return res

@router.get("/export/user/{user_id}")
async def admin_export_user(user_id: str, admin=Depends(get_current_admin)):
    service = AdminMetricsService()
    try:
        return await service.export_user_data(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
