from app.repositories.base_repo import BaseRepo


class AdminAuthSessionRepo(BaseRepo):
    collection_name = "admin_sessions"
