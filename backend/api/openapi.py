"""Deterministic OpenAPI construction for runtime and all-feature profiles."""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from backend.core.config import settings


def build_openapi(app: FastAPI) -> dict[str, Any]:
    if app.openapi_schema is not None:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version="1.0.0",
        description=(
            "Versioned modular-monolith API. Authentication uses the configured "
            "access cookie and state-changing cookie requests require the CSRF header."
        ),
        routes=app.routes,
    )
    components = schema.setdefault("components", {})
    components.setdefault(
        "schemas",
        {},
    ).setdefault(
        "ProblemDetails",
        {
            "type": "object",
            "required": ["type", "title", "status", "detail"],
            "properties": {
                "type": {"type": "string", "format": "uri-reference"},
                "title": {"type": "string"},
                "status": {"type": "integer", "format": "int32"},
                "detail": {"type": "string"},
                "instance": {"type": "string", "nullable": True},
                "correlation_id": {"type": "string", "nullable": True},
                "errors": {"type": "array", "items": {"type": "object"}},
            },
        },
    )
    security_schemes = components.setdefault("securitySchemes", {})
    security_schemes.setdefault(
        "accessCookie",
        {
            "type": "apiKey",
            "in": "cookie",
            "name": settings.ACCESS_COOKIE_NAME,
            "description": "HttpOnly access cookie for the configured deployment.",
        },
    )
    security_schemes.setdefault(
        "csrfToken",
        {
            "type": "apiKey",
            "in": "header",
            "name": settings.CSRF_HEADER_NAME,
            "description": "Required for cookie-authenticated state-changing requests.",
        },
    )
    schema["x-blueprint-contract-version"] = "v1"
    schema["x-blueprint-api-version"] = "v1"

    # FastAPI derives operation IDs from Python function names. Keep an
    # explicit, path-derived fallback for mounted routers that do not provide
    # one, and make accidental duplicates deterministic.
    used_ids: set[str] = set()
    for path, path_item in sorted(schema.get("paths", {}).items()):
        for method, operation in sorted(path_item.items()):
            if method.startswith("x-") or not isinstance(operation, dict):
                continue
            operation_id = str(operation.get("operationId") or f"{method}_{path}")
            normalized = "".join(
                character if character.isalnum() else "_" for character in operation_id
            ).strip("_")
            candidate = normalized or f"{method}_operation"
            suffix = 2
            while candidate in used_ids:
                candidate = f"{normalized}_{suffix}"
                suffix += 1
            operation["operationId"] = candidate
            used_ids.add(candidate)

    app.openapi_schema = schema
    return schema
