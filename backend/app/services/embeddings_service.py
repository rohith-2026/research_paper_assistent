import hashlib
from typing import List


class EmbeddingsService:
    """
    Lightweight, deterministic embedding service.
    Intended for local similarity without external dependencies.
    """

    def __init__(self, dim: int = 256):
        self.dim = dim

    def embed(self, text: str) -> List[float]:
        vec = [0.0] * self.dim
        if not text:
            return vec
        for token in text.lower().split():
            digest = hashlib.md5(token.encode("utf-8")).hexdigest()
            idx = int(digest[:8], 16) % self.dim
            vec[idx] += 1.0
        return vec
