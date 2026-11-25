"""Shared HTTP contract primitives.

The application keeps the legacy ``detail`` field so existing clients can
continue to render errors while the additional fields provide RFC 9457
Problem Details metadata for new clients.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

PROBLEM_JSON_MEDIA_TYPE = "application/problem+json"
PROBLEM_TYPE_BASE = "https://fullstack-blueprint.dev/problems"


class ProblemDetails(BaseModel):
    """RFC 9457-compatible error envelope with the legacy detail field."""

    type: str = Field(default=f"{PROBLEM_TYPE_BASE}/about:blank")
    title: str
    status: int
    detail: str
    instance: str | None = None
    correlation_id: str | None = None
    errors: list[dict[str, Any]] | None = None


def problem_details(
    request: Request,
    *,
    status: int,
    title: str,
    detail: str,
    problem_type: str | None = None,
    errors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Build a stable error payload without leaking exception internals."""

    payload = ProblemDetails(
        type=problem_type or f"{PROBLEM_TYPE_BASE}/{status}",
        title=title,
        status=status,
        detail=detail,
        instance=request.url.path,
        correlation_id=getattr(request.state, "correlation_id", None),
        errors=errors,
    ).model_dump(exclude_none=True)
    return payload


def problem_response(
    request: Request,
    *,
    status: int,
    title: str,
    detail: str,
    headers: Mapping[str, str] | None = None,
    problem_type: str | None = None,
    errors: list[dict[str, Any]] | None = None,
) -> JSONResponse:
    """Return a Problem Details response while retaining JSON compatibility."""

    response_headers = dict(headers or {})
    response_headers.setdefault("Content-Type", PROBLEM_JSON_MEDIA_TYPE)
    return JSONResponse(
        status_code=status,
        content=problem_details(
            request,
            status=status,
            title=title,
            detail=detail,
            problem_type=problem_type,
            errors=errors,
        ),
        headers=response_headers,
    )
