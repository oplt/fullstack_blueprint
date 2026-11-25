"""Provider-independent error taxonomy and safe error mapping."""

from __future__ import annotations

from enum import StrEnum


class AiErrorKind(StrEnum):
    CONFIGURATION = "configuration"
    AUTHENTICATION = "authentication"
    RATE_LIMIT = "rate_limit"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"
    INVALID_REQUEST = "invalid_request"
    STRUCTURED_OUTPUT = "structured_output"
    TRANSIENT = "transient"
    PROVIDER = "provider"
    CIRCUIT_OPEN = "circuit_open"
    BUDGET_EXCEEDED = "budget_exceeded"


class AiProviderError(Exception):
    """An error safe for application services to classify and expose."""

    def __init__(
        self,
        message: str,
        *,
        kind: AiErrorKind = AiErrorKind.PROVIDER,
        provider_key: str = "unknown",
        status_code: int | None = None,
        provider_request_id: str | None = None,
        retryable: bool = False,
        attempt: int = 0,
    ) -> None:
        super().__init__(message)
        self.kind = kind
        self.provider_key = provider_key
        self.status_code = status_code
        self.provider_request_id = provider_request_id
        self.retryable = retryable
        self.attempt = attempt


def classify_http_status(status_code: int) -> tuple[AiErrorKind, bool]:
    if status_code == 401 or status_code == 403:
        return AiErrorKind.AUTHENTICATION, False
    if status_code == 408 or status_code == 504:
        return AiErrorKind.TIMEOUT, True
    if status_code == 409 or status_code == 429:
        return AiErrorKind.RATE_LIMIT, True
    if status_code in {400, 404, 413, 422}:
        return AiErrorKind.INVALID_REQUEST, False
    if status_code in {500, 502, 503}:
        return AiErrorKind.TRANSIENT, True
    return AiErrorKind.PROVIDER, status_code >= 500
