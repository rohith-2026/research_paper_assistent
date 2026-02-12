import time
import threading
import os
from typing import Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
try:
    import redis.asyncio as redis
except Exception:  # pragma: no cover
    redis = None


_RATE_LIMITS = {}
_LOCK = threading.Lock()
_REDIS = None
_REDIS_URL = os.getenv("REDIS_URL", "").strip()
_TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "0") == "1"
if _REDIS_URL and redis:
    _REDIS = redis.from_url(_REDIS_URL, decode_responses=True)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    MongoDB-based rate limiter.

    Example:
        60 requests per 60 seconds per user/ip
    """

    def __init__(
        self,
        app,
        max_requests: int = 60,
        window_seconds: int = 60,
        include_paths: Optional[list[str]] = None,
        exclude_paths: Optional[list[str]] = None,
    ):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.include_paths = include_paths or []
        self.exclude_paths = exclude_paths or []

    def _should_check(self, path: str) -> bool:
        if self.exclude_paths and any(path.startswith(p) for p in self.exclude_paths):
            return False
        if self.include_paths:
            return any(path.startswith(p) for p in self.include_paths)
        return True

    def _client_key(self, request: Request) -> str:
        """
        Use IP address (no DB access). Optionally trust proxy headers.
        """
        ip = None
        if _TRUST_PROXY_HEADERS:
            fwd = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
            if fwd:
                ip = fwd.split(",")[0].strip()
        if not ip:
            ip = request.client.host if request.client else "unknown"
        return f"ip:{ip}"

    async def dispatch(self, request: Request, call_next):
        if not self._should_check(request.url.path):
            return await call_next(request)

        key = self._client_key(request)

        now = int(time.time())
        expires_at = now + self.window_seconds

        if _REDIS:
            count = await _REDIS.incr(key)
            if count == 1:
                await _REDIS.expire(key, self.window_seconds)
            if count > self.max_requests:
                retry_after = self.window_seconds
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded",
                        "retry_after_seconds": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )
            return await call_next(request)

        with _LOCK:
            doc = _RATE_LIMITS.get(key)
            if not doc:
                _RATE_LIMITS[key] = {"count": 1, "reset_at": expires_at}
                return await call_next(request)

            if now > doc["reset_at"]:
                _RATE_LIMITS[key] = {"count": 1, "reset_at": expires_at}
                return await call_next(request)

            if doc["count"] >= self.max_requests:
                retry_after = doc["reset_at"] - now
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded",
                        "retry_after_seconds": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )

            doc["count"] += 1
            _RATE_LIMITS[key] = doc

        return await call_next(request)
