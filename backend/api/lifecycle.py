import asyncio
import logging
from contextlib import AsyncExitStack, asynccontextmanager

from fastapi import FastAPI

from backend.core.cache import ping_redis, redis_client
from backend.core.config import settings
from backend.core.db.session import SessionLocal, engine
from backend.core.observability.redaction import redact_url
from backend.core.storage import object_storage
from backend.modules.platform.service import PlatformConfigService
from backend.workers.async_dispatch import (
    log_eager_mode_startup_warning,
    shutdown_background_runtime,
)

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
            from backend.core.observability.service import close_observability_http_client  # noqa: PLC0415 - observability-gated

            resources.push_async_callback(close_observability_http_client)
        if settings.AI_ENABLED or settings.RAG_ENABLED:
            from backend.modules.ai.providers import close_ai_provider_http_clients  # noqa: PLC0415 - ai-gated

            resources.push_async_callback(close_ai_provider_http_clients)
        resources.push_async_callback(asyncio.to_thread, shutdown_background_runtime)

        log_eager_mode_startup_warning()
        if settings.RAG_ENABLED:
            from backend.modules.rag.config import validate_rag_config  # noqa: PLC0415 - rag-gated

            validate_rag_config()
        if settings.MEMORY_ENABLED:
            from backend.modules.memory.config import validate_memory_config  # noqa: PLC0415 - memory-gated

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
                    from backend.modules.rag.config import (  # noqa: PLC0415 - rag-gated
                        validate_rag_index_health,
                    )

                    await validate_rag_index_health(db)
        logger.info("Application startup complete")
        try:
            yield
        finally:
            logger.info("Application shutdown started")
    logger.info("Application shutdown complete")
