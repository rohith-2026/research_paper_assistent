from app.repositories.base_repo import BaseRepo


class AdminAuditRepo(BaseRepo):
    collection_name = "admin_audit_logs"
