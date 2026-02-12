import os
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.db.mongo import get_db

_CACHE = {}
_CACHE_TTL = int(os.getenv("BLOCK_IP_CACHE_TTL", "60"))
_TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "0") == "1"
_DISABLE_BLOCK_IP = os.getenv("DISABLE_BLOCK_IP", "0") == "1" or bool(
    os.getenv("PYTEST_CURRENT_TEST")
)


def _client_ip(request: Request) -> str:
    ip = None
    if _TRUST_PROXY_HEADERS:
        fwd = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip")
        if fwd:
            ip = fwd.split(",")[0].strip()
    if not ip:
        ip = request.client.host if request.client else "unknown"
    return ip


async def _is_blocked(ip: str) -> bool:
    if _DISABLE_BLOCK_IP:
        return False
    now = time.time()
    cached = _CACHE.get(ip)
    if cached and now < cached["exp"]:
        return cached["blocked"]
    try:
        db = get_db()
        doc = await db["blocked_ips"].find_one({"ip": ip})
        blocked = bool(doc)
    except RuntimeError:
        # Avoid failing requests during test shutdown / loop teardown.
        blocked = False
    _CACHE[ip] = {"blocked": blocked, "exp": now + _CACHE_TTL}
    return blocked


class BlockIpMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, exclude_paths=None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or []

    def _should_check(self, path: str) -> bool:
        if self.exclude_paths and any(path.startswith(p) for p in self.exclude_paths):
            return False
        return True

    async def dispatch(self, request: Request, call_next):
        if _DISABLE_BLOCK_IP:
            return await call_next(request)
        if not self._should_check(request.url.path):
            return await call_next(request)
        ip = _client_ip(request)
        if await _is_blocked(ip):
            return JSONResponse(status_code=403, content={"detail": "IP blocked"})
        return await call_next(request)
