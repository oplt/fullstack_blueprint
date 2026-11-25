from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import text

from backend.core.cache import ping_redis, redis_client
from backend.core.config import settings
from backend.db.session import engine
from backend.workers.health import healthy_worker_count

health_router = APIRouter(prefix="/health", tags=["health"])


@health_router.get("/live")
async def live():
    return {"status": "ok"}


@health_router.get("/ready")
async def ready():
    if not settings.HEALTH_READY_PUBLIC and settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")
    checks: dict[str, str] = {}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception:
        checks["db"] = "error"

    try:
        await ping_redis(redis_client)
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"

    if settings.WORKER_HEALTH_REQUIRED:
        try:
            checks["workers"] = "ok" if await healthy_worker_count() > 0 else "error"
        except Exception:
            checks["workers"] = "error"

    all_ok = all(v == "ok" for v in checks.values())
    return JSONResponse(
        {"status": "ok" if all_ok else "degraded", "checks": checks},
        status_code=200 if all_ok else 503,
    )


@health_router.get("/workers")
async def workers():
    if not settings.HEALTH_READY_PUBLIC and settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        count = await healthy_worker_count()
    except Exception:
        return JSONResponse({"status": "error", "workers": 0}, status_code=503)
    return {"status": "ok" if count else "degraded", "workers": count}


@health_router.get("/version")
async def version():
    if not settings.HEALTH_VERSION_PUBLIC and settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "app": settings.APP_NAME,
        "env": settings.APP_ENV,
        "version": "0.1.0",
        "async_jobs": "celery",
    }
