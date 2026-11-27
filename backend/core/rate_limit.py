import hashlib
import logging

from fastapi import HTTPException, Request

from backend.core.cache import get_redis_client
from backend.core.config import settings

logger = logging.getLogger("backend.rate_limit")
_INCREMENT_WITH_TTL = """
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    ttl = redis.call('TTL', KEYS[1])
end
return {count, ttl}
"""


async def _increment_with_ttl(key: str, window_seconds: int) -> tuple[int, int]:
    if not key or window_seconds <= 0:
        raise ValueError("rate limit key and positive window are required")
    count, ttl = await get_redis_client().eval(_INCREMENT_WITH_TTL, 1, key, window_seconds)
    return int(count), max(1, int(ttl))


def _service_unavailable() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail="Rate limiting is temporarily unavailable",
        headers={"Retry-After": "5"},
    )


def _build_rate_limit_exception(ttl: int) -> HTTPException:
    ttl = max(1, ttl)
    return HTTPException(
        status_code=429,
        detail=f"Too many attempts. Try again in {ttl} seconds.",
        headers={"Retry-After": str(ttl)},
    )


async def check_rate_limit(key: str, max_attempts: int, window_seconds: int) -> None:
    if max_attempts <= 0:
        raise ValueError("max_attempts must be positive")
    if window_seconds <= 0 or not key:
        raise ValueError("rate limit key and positive window are required")
    try:
        count, ttl = await _increment_with_ttl(key, window_seconds)
        if count > max_attempts:
            raise _build_rate_limit_exception(ttl)
    except HTTPException:
        raise
    except Exception:
        if not settings.RATE_LIMIT_FAIL_OPEN:
            raise _service_unavailable() from None
        logger.warning("rate limit check skipped (redis unavailable)")


async def enforce_rate_limit(key: str, max_attempts: int) -> None:
    if max_attempts <= 0:
        raise ValueError("max_attempts must be positive")
    try:
        count = await get_redis_client().get(key)
        if count is not None and int(count) > max_attempts:
            ttl = await get_redis_client().ttl(key)
            raise _build_rate_limit_exception(max(1, int(ttl)))
    except HTTPException:
        raise
    except Exception:
        if not settings.RATE_LIMIT_FAIL_OPEN:
            raise _service_unavailable() from None
        logger.warning("rate limit enforce skipped (redis unavailable)")


async def increment_rate_limit(key: str, window_seconds: int) -> int:
    if window_seconds <= 0 or not key:
        raise ValueError("rate limit key and positive window are required")
    try:
        count, _ = await _increment_with_ttl(key, window_seconds)
        return count
    except Exception:
        if not settings.RATE_LIMIT_FAIL_OPEN:
            raise _service_unavailable() from None
        logger.warning("rate limit increment skipped (redis unavailable)")
        return 0


async def clear_rate_limit(key: str) -> None:
    try:
        await get_redis_client().delete(key)
    except Exception:
        logger.warning("rate limit clear skipped (redis unavailable)")


def auth_rate_limit_key(request: Request, email: str, *, namespace: str = "auth") -> str:
    client_ip = request.client.host if request.client else "unknown"
    email_hash = hashlib.sha256(email.strip().casefold().encode()).hexdigest()
    return f"rate_limit:{namespace}:{client_ip}:{email_hash}"


def auth_account_rate_limit_key(account: str, *, namespace: str = "auth") -> str:
    account_hash = hashlib.sha256(account.strip().casefold().encode()).hexdigest()
    return f"rate_limit:{namespace}:account:{account_hash}"


def auth_client_rate_limit_key(request: Request, *, namespace: str = "auth") -> str:
    client_ip = request.client.host if request.client else "unknown"
    return f"rate_limit:{namespace}:client:{client_ip}"
