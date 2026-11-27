"""Provider-independent error taxonomy and safe error mapping."""

from __future__ import annotations

from enum import StrEnum
from http import HTTPStatus


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
    if status_code in {HTTPStatus.UNAUTHORIZED, HTTPStatus.FORBIDDEN}:
        return AiErrorKind.AUTHENTICATION, False
    if status_code in {HTTPStatus.REQUEST_TIMEOUT, HTTPStatus.GATEWAY_TIMEOUT}:
        return AiErrorKind.TIMEOUT, True
    if status_code in {HTTPStatus.CONFLICT, HTTPStatus.TOO_MANY_REQUESTS}:
        return AiErrorKind.RATE_LIMIT, True
    if status_code in {
        HTTPStatus.BAD_REQUEST,
        HTTPStatus.NOT_FOUND,
        HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
        HTTPStatus.UNPROCESSABLE_ENTITY,
    }:
        return AiErrorKind.INVALID_REQUEST, False
    if status_code in {
        HTTPStatus.INTERNAL_SERVER_ERROR,
        HTTPStatus.BAD_GATEWAY,
        HTTPStatus.SERVICE_UNAVAILABLE,
    }:
        return AiErrorKind.TRANSIENT, True
    return AiErrorKind.PROVIDER, status_code >= HTTPStatus.INTERNAL_SERVER_ERROR
