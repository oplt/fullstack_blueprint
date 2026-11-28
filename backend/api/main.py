from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from backend.api.lifecycle import lifespan
from backend.api.openapi import build_openapi
from backend.api.router import api_router
from backend.core.config import settings
from backend.core.errors import register_exception_handlers
from backend.core.middleware.correlation_id import CorrelationIdMiddleware
from backend.core.middleware.csrf import CSRFMiddleware
from backend.core.middleware.public_rate_limit import PublicRateLimitMiddleware
from backend.core.middleware.request_limits import RequestBodyLimitMiddleware
from backend.core.middleware.request_logging import RequestLoggingMiddleware
from backend.core.middleware.security_headers import SecurityHeadersMiddleware
from backend.core.observability.health import health_router
from backend.core.observability.logging import setup_logging

setup_logging()

app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    openapi_url="/openapi.json" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(RequestBodyLimitMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(PublicRateLimitMiddleware)
app.add_middleware(CSRFMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Idempotency-Key",
        "X-Correlation-ID",
        "X-Request-ID",
        settings.CSRF_HEADER_NAME,
    ],
    expose_headers=["Retry-After", "X-Correlation-ID", "X-Request-ID"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CorrelationIdMiddleware)
if settings.ALLOWED_HOSTS:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
if settings.TRUSTED_PROXY_IPS:
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=settings.TRUSTED_PROXY_IPS)

register_exception_handlers(app)
app.include_router(api_router)
app.include_router(health_router)


def _openapi() -> dict:
    return build_openapi(app)


app.openapi = _openapi

# Metrics and OTLP instrumentation must register before the ASGI app starts.
if settings.OBSERVABILITY_ENABLED:
    from backend.core.observability import setup_observability

    setup_observability(app)
