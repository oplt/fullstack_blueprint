import secrets
from urllib.parse import urlsplit

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from backend.core.config import settings

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_EXEMPT_PATHS = {
    "/api/v1/auth/sign-in",
    "/api/v1/auth/sign-up",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/verify-email",
    "/api/v1/auth/resend-verification",
    "/health/live",
}
ORIGIN_REQUIRED_PATHS = {
    "/api/v1/auth/sign-in",
    "/api/v1/auth/refresh",
    "/api/v1/auth/logout",
}


def _normalize_origin(value: str) -> str | None:
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        return None
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
    ):
        return None
    scheme = parsed.scheme.lower()
    hostname = parsed.hostname.lower()
    host = f"[{hostname}]" if ":" in hostname else hostname
    if port and port != (443 if scheme == "https" else 80):
        host = f"{host}:{port}"
    return f"{scheme}://{host}"


def _origin_from_referer(value: str) -> str | None:
    try:
        parsed = urlsplit(value)
    except ValueError:
        return None
    if not parsed.scheme or not parsed.netloc:
        return None
    return _normalize_origin(f"{parsed.scheme}://{parsed.netloc}")


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method in SAFE_METHODS:
            return await call_next(request)

        auth_cookie = request.cookies.get(settings.ACCESS_COOKIE_NAME) or request.cookies.get(
            settings.REFRESH_COOKIE_NAME
        )
        origin_header = request.headers.get("origin")
        referer_header = request.headers.get("referer")
        if origin_header:
            request_origin = _normalize_origin(origin_header)
        elif referer_header:
            request_origin = _origin_from_referer(referer_header)
        else:
            request_origin = None
        allowed_origins = {
            origin
            for origin in (_normalize_origin(value) for value in settings.allowed_origins)
            if origin is not None
        }
        if origin_header or referer_header:
            if request_origin is None or request_origin not in allowed_origins:
                return JSONResponse(status_code=403, content={"detail": "CSRF validation failed"})
        elif auth_cookie or request.url.path in ORIGIN_REQUIRED_PATHS:
            return JSONResponse(status_code=403, content={"detail": "CSRF validation failed"})

        if request.url.path in CSRF_EXEMPT_PATHS and not auth_cookie:
            return await call_next(request)

        csrf_cookie = request.cookies.get(settings.CSRF_COOKIE_NAME)
        csrf_header = request.headers.get(settings.CSRF_HEADER_NAME)
        if auth_cookie and (
            not csrf_cookie
            or not csrf_header
            or not secrets.compare_digest(csrf_cookie.encode(), csrf_header.encode())
        ):
            return JSONResponse(status_code=403, content={"detail": "CSRF validation failed"})

        return await call_next(request)
