from app.db.mongo import users_col, refresh_tokens_col, password_resets_col, queries_col, get_db

from app.db.mongo import papers_col
async def ensure_indexes() -> None:
    # users
    await users_col.create_index("email", unique=True)

    # refresh tokens
    await refresh_tokens_col.create_index("user_id")
    await refresh_tokens_col.create_index("token_hash", unique=True)
    await refresh_tokens_col.create_index("expires_at", expireAfterSeconds=0)  # TTL

    # password resets
    await password_resets_col.create_index("user_id")
    await password_resets_col.create_index("expires_at", expireAfterSeconds=0)  # TTL

    # queries history
    await queries_col.create_index([("user_id", 1), ("created_at", -1)])

    # OK saved papers
    await papers_col.create_index("user_id")
    await papers_col.create_index("created_at")
    try:
        await papers_col.drop_index("user_id_1_title_1")
    except Exception:
        pass
    await papers_col.create_index([("user_id", 1), ("title", 1)])
    await papers_col.create_index([("user_id", 1), ("kind", 1), ("created_at", -1)])
    await papers_col.create_index([("user_id", 1), ("query_id", 1), ("rank", 1)])

    db = get_db()

    # admin users
    admin_users = db["admin_users"]
    admin_sessions = db["admin_sessions"]
    admin_audit_logs = db["admin_audit_logs"]
    abuse_flags = db["abuse_flags"]
    admin_settings = db["admin_settings"]

    await admin_users.create_index("email", unique=True)
    await admin_users.create_index("created_at")
    await admin_sessions.create_index("admin_id")
    await admin_sessions.create_index("created_at")
    await admin_sessions.create_index("revoked")
    await admin_audit_logs.create_index("admin_id")
    await admin_audit_logs.create_index("created_at")
    await abuse_flags.create_index("user_id")
    await abuse_flags.create_index("created_at")
    await admin_settings.create_index("updated_at")
    await admin_settings.create_index("created_at")

    # paper_summaries: migrate old index to paper_uid-based unique index
    paper_summaries = db["paper_summaries"]
    try:
        await paper_summaries.drop_index("user_id_1_paper_id_1_summary_type_1")
    except Exception:
        pass
    await paper_summaries.create_index(
        [("user_id", 1), ("paper_uid", 1), ("summary_type", 1)],
        unique=True,
        partialFilterExpression={"paper_uid": {"$type": "string"}},
    )
