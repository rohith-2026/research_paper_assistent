from bson import ObjectId


def is_valid_object_id(value: str) -> bool:
    return ObjectId.is_valid(value)


def require_non_empty(value: str, field: str) -> str:
    if value is None or not str(value).strip():
        raise ValueError(f"{field} required")
    return str(value).strip()
