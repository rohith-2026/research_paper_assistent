# app/middleware/request_id.py
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Accept existing request id (from gateway/nginx) else create new
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        request.state.request_id = rid
        response: Response = await call_next(request)

        response.headers["X-Request-ID"] = rid
        return response
