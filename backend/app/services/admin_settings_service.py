from app.core.security import now_utc
from app.repositories.admin_settings_repo import AdminSettingsRepo


class AdminSettingsService:
    DEFAULTS = {
        "maintenance_mode": False,
        "maintenance_banner": "",
        "maintenance_window_start": None,
        "maintenance_window_end": None,
        "signups_enabled": True,
        "audit_logging": True,
        "abuse_detection": True,
        "alert_email": "",
        "alert_recipients": "",
        "digest_frequency": "weekly",
        "smtp_host": "",
        "smtp_port": 587,
        "smtp_user": "",
        "smtp_password": "",
        "smtp_from": "",
        "alert_severity": "medium",
        "api_spike_threshold": 5000,
        "rate_limit_requests": 200,
        "rate_limit_window_seconds": 60,
        "rate_limit_auth_requests": 30,
        "rate_limit_auth_window_seconds": 60,
        "rate_limit_chat_requests": 60,
        "rate_limit_chat_window_seconds": 60,
        "rate_limit_download_requests": 120,
        "rate_limit_download_window_seconds": 300,
        "data_retention_days": 90,
        "ui_compact_mode": False,
        "ui_reduced_motion": False,
        "feature_graph": True,
        "feature_summaries": True,
        "feature_downloads": True,
        "feature_beta": False,
    }

    def __init__(self, db=None):
        self.repo = AdminSettingsRepo(db=db)

    async def get_settings(self) -> dict:
        doc = await self.repo.find_one({"_id": "global"})
        if not doc:
            return {"id": "global", **self.DEFAULTS}
        doc = dict(doc)
        doc["id"] = str(doc.pop("_id"))
        for k, v in self.DEFAULTS.items():
            doc.setdefault(k, v)
        return doc

    async def update_settings(self, payload: dict) -> dict:
        updates = {k: payload[k] for k in self.DEFAULTS.keys() if k in payload}
        updates["updated_at"] = now_utc()
        await self.repo.update_one(
            {"_id": "global"},
            {"$set": updates, "$setOnInsert": {"created_at": now_utc()}},
            upsert=True,
        )
        return await self.get_settings()
