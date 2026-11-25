import logging

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from backend.core.config import settings
from backend.core.rate_limit import _build_rate_limit_exception, _increment_with_ttl

logger = logging.getLogger("backend.rate_limit")


class PublicRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        max_requests = settings.effective_public_rate_limit_requests
        is_probe = request.url.path in {"/health/live", "/health/ready"}
        should_limit = request.url.path.startswith(("/api/", "/health/"))
        if max_requests <= 0 or is_probe or not should_limit:
            return await call_next(request)

        if settings.PUBLIC_RATE_LIMIT_WINDOW_SECONDS <= 0:
            logger.error("public rate limit window must be positive")
            return JSONResponse(status_code=503, content={"detail": "Service unavailable"})
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:public:{client_ip}"
        try:
            count, ttl = await _increment_with_ttl(key, settings.PUBLIC_RATE_LIMIT_WINDOW_SECONDS)
            if count > max_requests:
                error = _build_rate_limit_exception(ttl)
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Try again later."},
                    headers=error.headers,
                )
        except Exception:
            if not settings.RATE_LIMIT_FAIL_OPEN:
                logger.error("public rate limit unavailable; rejecting request")
                return JSONResponse(
                    status_code=503,
                    content={"detail": "Rate limiting is temporarily unavailable"},
                    headers={"Retry-After": "5"},
                )
            logger.warning("public rate limit skipped (redis unavailable)")

        return await call_next(request)
