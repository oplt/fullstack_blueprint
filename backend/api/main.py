import asyncio
import logging
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from backend.core.cache import ping_redis, redis_client
from backend.core.config import settings
from backend.core.error_handler import register_exception_handlers
from backend.core.log_redaction import redact_url
from backend.core.logging import setup_logging
from backend.core.storage import object_storage
from backend.db.session import SessionLocal, engine
from backend.modules.platform.config_service import PlatformConfigService
from backend.workers.async_dispatch import (
    log_eager_mode_startup_warning,
    shutdown_background_runtime,
)

from .middleware.correlation_id import CorrelationIdMiddleware
from .middleware.csrf import CSRFMiddleware
from .middleware.public_rate_limit import PublicRateLimitMiddleware
from .middleware.request_limits import RequestBodyLimitMiddleware
from .middleware.request_logging import RequestLoggingMiddleware
from .middleware.security_headers import SecurityHeadersMiddleware
from .openapi import build_openapi
from .router import api_router
from .v1.health import health_router

setup_logging()

logger = logging.getLogger("backend.startup")
_STARTUP_CHECK_TIMEOUT_SECONDS = 10.0


@asynccontextmanager
async def lifespan(_app: FastAPI):
    logger.info(
        "Application startup app=%s env=%s log_level=%s",
        settings.APP_NAME,
        settings.APP_ENV,
        settings.LOG_LEVEL.upper(),
    )
    async with AsyncExitStack() as resources:
        resources.push_async_callback(engine.dispose)
        resources.push_async_callback(redis_client.aclose)
        if settings.OBSERVABILITY_ENABLED:
            from backend.observability.service import close_observability_http_client

            resources.push_async_callback(close_observability_http_client)
        if settings.AI_ENABLED or settings.RAG_ENABLED:
            from backend.modules.ai.providers import close_ai_provider_http_clients

            resources.push_async_callback(close_ai_provider_http_clients)
        resources.push_async_callback(asyncio.to_thread, shutdown_background_runtime)

        log_eager_mode_startup_warning()
        if settings.RAG_ENABLED:
            from backend.modules.rag.infrastructure.rag_config import validate_rag_config

            validate_rag_config()
        if settings.MEMORY_ENABLED:
            from backend.modules.memory.infrastructure.memory_config import validate_memory_config

            validate_memory_config()
        if settings.STORAGE_BUCKET:
            async with asyncio.timeout(_STARTUP_CHECK_TIMEOUT_SECONDS):
                await object_storage.ensure_bucket()
        async with asyncio.timeout(_STARTUP_CHECK_TIMEOUT_SECONDS):
            await ping_redis()
        logger.info("Redis connection established url=%s", redact_url(settings.REDIS_URL))
        async with asyncio.timeout(_STARTUP_CHECK_TIMEOUT_SECONDS):
            async with SessionLocal() as db:
                await PlatformConfigService(db).ensure_defaults()
                if settings.RAG_ENABLED:
                    from backend.modules.rag.infrastructure.rag_config import (
                        validate_rag_index_health,
                    )

                    await validate_rag_index_health(db)
        logger.info("Application startup complete")
        try:
            yield
        finally:
            logger.info("Application shutdown started")
    logger.info("Application shutdown complete")


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
    from backend.observability import setup_observability

    setup_observability(app)
