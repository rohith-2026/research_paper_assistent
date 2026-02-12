from math import sqrt


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for i in range(len(a)):
        dot += a[i] * b[i]
        na += a[i] * a[i]
        nb += b[i] * b[i]
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (sqrt(na) * sqrt(nb))


def keyword_overlap_score(a: str, b: str) -> float:
    a_tokens = set([t for t in (a or "").lower().split() if len(t) > 2])
    b_tokens = set([t for t in (b or "").lower().split() if len(t) > 2])
    if not a_tokens or not b_tokens:
        return 0.0
    inter = len(a_tokens & b_tokens)
    union = len(a_tokens | b_tokens)
    return inter / union if union else 0.0


def year_proximity_score(year_a: int | None, year_b: int | None) -> float:
    if not year_a or not year_b:
        return 0.0
    diff = abs(int(year_a) - int(year_b))
    if diff == 0:
        return 1.0
    if diff >= 10:
        return 0.0
    return max(0.0, 1.0 - (diff / 10.0))
