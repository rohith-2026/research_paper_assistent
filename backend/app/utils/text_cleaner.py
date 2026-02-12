import re


def clean_text(text: str) -> str:
    if not text:
        return ""
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def truncate_text(text: str, max_len: int = 20000) -> str:
    if not text:
        return ""
    return text[:max_len]
