"""
MongoDB schema + index definitions for the Research Paper Assistant.

This is intentionally decoupled from startup to keep it safe to run
only when you want to (e.g., provisioning a new database).
"""

from __future__ import annotations

from typing import Any, Dict, List

from app.db.mongo import get_db


def _schema(
    *,
    required: List[str] | None = None,
    properties: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    return {
        "bsonType": "object",
        "required": required or [],
        "properties": properties or {},
    }


COLLECTION_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "users": _schema(
        required=["email", "password_hash", "created_at"],
        properties={
            "name": {"bsonType": "string"},
            "email": {"bsonType": "string"},
            "password_hash": {"bsonType": "string"},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
            "is_active": {"bsonType": "bool"},
            "analytics_opt_out": {"bsonType": "bool"},
            "last_login_at": {"bsonType": "date"},
        },
    ),
    "refresh_tokens": _schema(
        required=["user_id", "token_hash", "expires_at", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "token_hash": {"bsonType": "string"},
            "expires_at": {"bsonType": "date"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "password_resets": _schema(
        required=["user_id", "token_hash", "expires_at", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "token_hash": {"bsonType": "string"},
            "expires_at": {"bsonType": "date"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "queries": _schema(
        required=["user_id", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "input_type": {"bsonType": "string"},
            "text": {"bsonType": "string"},
            "input_text": {"bsonType": "string"},
            "subject_area": {"bsonType": "string"},
            "confidence": {"bsonType": "double"},
            "top_predictions": {"bsonType": "array"},
            "papers": {"bsonType": "array"},
            "gpt_answer": {"bsonType": ["string", "null"]},
            "file": {"bsonType": ["object", "null"]},
            "predicted_topics": {"bsonType": "array"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "papers": _schema(
        required=["user_id", "title", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "query_id": {"bsonType": "objectId"},
            "query_created_at": {"bsonType": "date"},
            "rank": {"bsonType": "int"},
            "title": {"bsonType": "string"},
            "abstract": {"bsonType": ["string", "null"]},
            "url": {"bsonType": ["string", "null"]},
            "authors": {"bsonType": "array"},
            "year": {"bsonType": ["int", "null"]},
            "venue": {"bsonType": ["string", "null"]},
            "source": {"bsonType": ["string", "null"]},
            "subject_area": {"bsonType": ["string", "null"]},
            "paper_uid": {"bsonType": ["string", "null"]},
            "kind": {"bsonType": ["string", "null"]},
            "created_at": {"bsonType": "date"},
        },
    ),
    "collections": _schema(
        required=["user_id", "name", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "name": {"bsonType": "string"},
            "position": {"bsonType": "int"},
            "tags": {"bsonType": "array"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "collection_items": _schema(
        required=["collection_id", "paper_id", "added_at"],
        properties={
            "collection_id": {"bsonType": "objectId"},
            "paper_id": {"bsonType": "objectId"},
            "added_at": {"bsonType": "date"},
        },
    ),
    "notes": _schema(
        required=["user_id", "paper_id", "content", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "paper_id": {"bsonType": "objectId"},
            "content": {"bsonType": "string"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "downloads": _schema(
        required=["user_id", "paper_id", "format", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "paper_id": {"bsonType": "objectId"},
            "format": {"bsonType": "string"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "feedback": _schema(
        required=["user_id", "type", "message", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "type": {"bsonType": "string"},
            "message": {"bsonType": "string"},
            "attachments": {"bsonType": "array"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "chat_sessions": _schema(
        required=["user_id", "title", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "title": {"bsonType": "string"},
            "status": {"bsonType": ["string", "null"]},
            "created_at": {"bsonType": "date"},
            "last_used_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
        },
    ),
    "chat_messages": _schema(
        required=["session_id", "user_id", "role", "content", "created_at"],
        properties={
            "session_id": {"bsonType": "objectId"},
            "user_id": {"bsonType": "objectId"},
            "role": {"bsonType": "string"},
            "content": {"bsonType": "string"},
            "meta": {"bsonType": "object"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "analytics_events": _schema(
        required=["user_id", "event", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "event": {"bsonType": "string"},
            "meta": {"bsonType": "object"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "api_usage": _schema(
        required=["user_id", "endpoint", "date"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "endpoint": {"bsonType": "string"},
            "date": {"bsonType": "string"},
            "count": {"bsonType": "int"},
            "status": {"bsonType": ["int", "null"]},
            "latency_ms": {"bsonType": ["double", "null"]},
            "model": {"bsonType": ["string", "null"]},
            "source": {"bsonType": ["string", "null"]},
        },
    ),
    "admin_users": _schema(
        required=["email", "password_hash", "created_at"],
        properties={
            "email": {"bsonType": "string"},
            "password_hash": {"bsonType": "string"},
            "role": {"bsonType": "string"},
            "is_active": {"bsonType": "bool"},
            "created_at": {"bsonType": "date"},
            "updated_at": {"bsonType": "date"},
            "last_login_at": {"bsonType": "date"},
        },
    ),
    "admin_sessions": _schema(
        required=["admin_id", "created_at"],
        properties={
            "admin_id": {"bsonType": "objectId"},
            "created_at": {"bsonType": "date"},
            "last_seen_at": {"bsonType": "date"},
            "revoked": {"bsonType": "bool"},
            "revoked_at": {"bsonType": ["date", "null"]},
            "user_agent": {"bsonType": ["string", "null"]},
            "ip": {"bsonType": ["string", "null"]},
            "expires_at": {"bsonType": ["date", "null"]},
            "sudo_until": {"bsonType": ["date", "null"]},
        },
    ),
    "admin_audit_logs": _schema(
        required=["admin_id", "action", "created_at"],
        properties={
            "admin_id": {"bsonType": "objectId"},
            "action": {"bsonType": "string"},
            "meta": {"bsonType": "object"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "abuse_flags": _schema(
        required=["user_id", "created_at"],
        properties={
            "user_id": {"bsonType": "objectId"},
            "reason": {"bsonType": ["string", "null"]},
            "notes": {"bsonType": ["string", "null"]},
            "created_at": {"bsonType": "date"},
        },
    ),
    "admin_settings": _schema(
        required=["updated_at"],
        properties={
            "updated_at": {"bsonType": "date"},
            "created_at": {"bsonType": "date"},
        },
    ),
    "blocked_ips": _schema(
        required=["ip", "created_at"],
        properties={
            "ip": {"bsonType": "string"},
            "reason": {"bsonType": ["string", "null"]},
            "expires_at": {"bsonType": ["date", "null"]},
            "created_at": {"bsonType": "date"},
        },
    ),
    "system_health_snapshots": _schema(
        required=["created_at"],
        properties={
            "created_at": {"bsonType": "date"},
            "cpu": {"bsonType": ["object", "null"]},
            "memory": {"bsonType": ["object", "null"]},
            "disk": {"bsonType": ["object", "null"]},
            "net": {"bsonType": ["object", "null"]},
        },
    ),
    "system_health_meta": _schema(
        required=["_id"],
        properties={
            "_id": {"bsonType": "string"},
            "value": {"bsonType": ["int", "double"]},
            "updated_at": {"bsonType": "date"},
        },
    ),
}


COLLECTION_INDEXES: Dict[str, List[Dict[str, Any]]] = {
    "users": [
        {"keys": [("email", 1)], "unique": True},
    ],
    "refresh_tokens": [
        {"keys": [("user_id", 1)]},
        {"keys": [("token_hash", 1)], "unique": True},
        {"keys": [("expires_at", 1)], "expireAfterSeconds": 0},
    ],
    "password_resets": [
        {"keys": [("user_id", 1)]},
        {"keys": [("expires_at", 1)], "expireAfterSeconds": 0},
    ],
    "queries": [
        {"keys": [("user_id", 1), ("created_at", -1)]},
    ],
    "papers": [
        {"keys": [("user_id", 1)]},
        {"keys": [("created_at", 1)]},
        {"keys": [("user_id", 1), ("title", 1)]},
        {"keys": [("user_id", 1), ("kind", 1), ("created_at", -1)]},
        {"keys": [("user_id", 1), ("query_id", 1), ("rank", 1)]},
    ],
    "collections": [
        {"keys": [("user_id", 1)]},
        {"keys": [("user_id", 1), ("position", 1)]},
    ],
    "collection_items": [
        {"keys": [("collection_id", 1)]},
        {"keys": [("paper_id", 1)]},
        {"keys": [("collection_id", 1), ("paper_id", 1)], "unique": True},
    ],
    "notes": [
        {"keys": [("user_id", 1)]},
        {"keys": [("paper_id", 1)]},
        {"keys": [("user_id", 1), ("paper_id", 1), ("created_at", -1)]},
    ],
    "downloads": [
        {"keys": [("user_id", 1)]},
        {"keys": [("paper_id", 1)]},
        {"keys": [("user_id", 1), ("created_at", -1)]},
    ],
    "feedback": [
        {"keys": [("user_id", 1)]},
        {"keys": [("created_at", -1)]},
    ],
    "chat_sessions": [
        {"keys": [("user_id", 1)]},
        {"keys": [("user_id", 1), ("last_used_at", -1)]},
    ],
    "chat_messages": [
        {"keys": [("session_id", 1), ("created_at", 1)]},
        {"keys": [("user_id", 1), ("session_id", 1), ("created_at", -1)]},
    ],
    "analytics_events": [
        {"keys": [("user_id", 1), ("created_at", -1)]},
        {"keys": [("event", 1)]},
    ],
    "api_usage": [
        {"keys": [("user_id", 1), ("date", 1), ("endpoint", 1)], "unique": True},
        {"keys": [("date", 1)]},
    ],
    "admin_users": [
        {"keys": [("email", 1)], "unique": True},
        {"keys": [("created_at", 1)]},
    ],
    "admin_sessions": [
        {"keys": [("admin_id", 1)]},
        {"keys": [("created_at", 1)]},
        {"keys": [("revoked", 1)]},
    ],
    "admin_audit_logs": [
        {"keys": [("admin_id", 1)]},
        {"keys": [("created_at", 1)]},
    ],
    "abuse_flags": [
        {"keys": [("user_id", 1)]},
        {"keys": [("created_at", 1)]},
    ],
    "admin_settings": [
        {"keys": [("updated_at", 1)]},
        {"keys": [("created_at", 1)]},
    ],
    "blocked_ips": [
        {"keys": [("ip", 1)], "unique": True},
        {"keys": [("expires_at", 1)], "expireAfterSeconds": 0},
    ],
    "system_health_snapshots": [
        {"keys": [("created_at", -1)]},
    ],
    "system_health_meta": [
        {"keys": [("updated_at", 1)]},
    ],
    "paper_summaries": [
        {
            "keys": [("user_id", 1), ("paper_uid", 1), ("summary_type", 1)],
            "unique": True,
            "partialFilterExpression": {"paper_uid": {"$type": "string"}},
        },
        {"keys": [("created_at", -1)]},
    ],
}


async def ensure_schema_and_indexes(db=None) -> None:
    """
    Create collections (if missing), apply schema validators, and ensure indexes.
    Uses validationAction='warn' to avoid breaking existing data.
    """
    db = db or get_db()
    existing = set(await db.list_collection_names())

    for name, schema in COLLECTION_SCHEMAS.items():
        validator = {"$jsonSchema": schema}
        if name not in existing:
            await db.create_collection(
                name,
                validator=validator,
                validationLevel="moderate",
                validationAction="warn",
            )
        else:
            await db.command(
                "collMod",
                name,
                validator=validator,
                validationLevel="moderate",
                validationAction="warn",
            )

    for name, indexes in COLLECTION_INDEXES.items():
        col = db[name]
        for idx in indexes:
            keys = idx.get("keys", [])
            options = {k: v for k, v in idx.items() if k != "keys"}
            await col.create_index(keys, **options)
