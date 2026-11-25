"""Small, process-local reliability primitives used by provider adapters."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from time import monotonic
from typing import TypeVar

from backend.core.config import settings
from backend.modules.ai.errors import AiErrorKind, AiProviderError

T = TypeVar("T")


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    max_attempts: int = 3
    base_delay_seconds: float = 0.25
    max_delay_seconds: float = 8.0

    async def run(self, operation: Callable[[], Awaitable[T]]) -> T:
        last_error: AiProviderError | None = None
        for attempt in range(1, max(1, self.max_attempts) + 1):
            try:
                return await operation()
            except AiProviderError as exc:
                if not exc.retryable or attempt >= self.max_attempts:
                    exc.attempt = attempt
                    raise
                last_error = exc
                await asyncio.sleep(
                    min(self.max_delay_seconds, self.base_delay_seconds * (2 ** (attempt - 1)))
                )
        assert last_error is not None
        raise last_error


class CircuitBreaker:
    def __init__(self, *, failure_threshold: int = 5, cooldown_seconds: float = 30.0) -> None:
        self.failure_threshold = max(1, failure_threshold)
        self.cooldown_seconds = max(0.0, cooldown_seconds)
        self._failures: defaultdict[str, int] = defaultdict(int)
        self._opened_at: dict[str, float] = {}

    def allow(self, key: str) -> bool:
        opened_at = self._opened_at.get(key)
        return opened_at is None or monotonic() - opened_at >= self.cooldown_seconds

    def record_success(self, key: str) -> None:
        self._failures.pop(key, None)
        self._opened_at.pop(key, None)

    def record_failure(self, key: str) -> None:
        self._failures[key] += 1
        if self._failures[key] >= self.failure_threshold:
            self._opened_at[key] = monotonic()

    def ensure_allowed(self, key: str, *, provider_key: str) -> None:
        if not self.allow(key):
            raise AiProviderError(
                "Provider temporarily unavailable",
                kind=AiErrorKind.CIRCUIT_OPEN,
                provider_key=provider_key,
                retryable=True,
            )


class ProviderConcurrency:
    def __init__(self, limit: int = 16) -> None:
        self._semaphore = asyncio.Semaphore(max(1, limit))

    async def run(self, operation: Callable[[], Awaitable[T]]) -> T:
        async with self._semaphore:
            return await operation()


_breakers = CircuitBreaker(
    failure_threshold=settings.AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD,
    cooldown_seconds=settings.AI_CIRCUIT_BREAKER_COOLDOWN_SECONDS,
)
_concurrency = ProviderConcurrency(settings.AI_MAX_CONCURRENT_REQUESTS)


async def execute_provider_call[T](
    *,
    provider_key: str,
    model: str,
    operation: Callable[[], Awaitable[T]],
    timeout_seconds: float | None = None,
) -> T:
    breaker_key = f"{provider_key}:{model}"
    _breakers.ensure_allowed(breaker_key, provider_key=provider_key)

    async def guarded() -> T:
        try:
            async with asyncio.timeout(timeout_seconds or settings.AI_REQUEST_TIMEOUT_SECONDS):
                result = await RetryPolicy(settings.AI_RETRY_MAX_ATTEMPTS).run(operation)
        except asyncio.CancelledError:
            raise AiProviderError(
                "AI request cancelled",
                kind=AiErrorKind.CANCELLED,
                provider_key=provider_key,
                retryable=False,
            ) from None
        except TimeoutError as exc:
            _breakers.record_failure(breaker_key)
            raise AiProviderError(
                "AI provider request timed out",
                kind=AiErrorKind.TIMEOUT,
                provider_key=provider_key,
                retryable=True,
            ) from exc
        except AiProviderError:
            _breakers.record_failure(breaker_key)
            raise
        else:
            _breakers.record_success(breaker_key)
            return result

    return await _concurrency.run(guarded)


def redact_text(value: str, *, max_chars: int = 2000) -> str:
    """Return a bounded operational string without prompt contents by default."""

    if len(value) <= max_chars:
        return value
    return f"{value[:max_chars]}…"
