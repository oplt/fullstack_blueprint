# API contracts

## Versioning

HTTP routes are versioned under `/api/v1`. Additive fields and endpoints are preferred.
Breaking changes require a new version or an explicitly documented compatibility window.

## Errors

Errors use RFC 9457 fields (`type`, `title`, `status`, `detail`, and `instance`) with
`correlation_id` and validation `errors`. The legacy `detail` field remains present so the
existing frontend can continue rendering FastAPI errors during the transition. Responses
use `application/problem+json`.

## Lists

Existing resources use bounded `limit`/`offset` pagination. Append-only or high-cardinality
resources may opt into `CursorPaginationParams` and return a URL-safe `next_cursor`; cursor
ownership and filtering must be enforced by the repository query.

## Commands

Commands that are safe to replay may opt into the validated `Idempotency-Key` dependency.
The key must be persisted with the command/result before returning success; a header alone
does not make a command idempotent. Cookie-authenticated writes still require CSRF.

## OpenAPI

`backend/scripts/export_openapi.py` supports:

- `--profile all`: enables every optional router for a stable generated-client contract.
- `--profile runtime`: reflects deployment feature configuration.

The exporter adds explicit access-cookie and CSRF-header security schemes and contract
version metadata. The frontend retains its credentialed transport, token refresh, and CSRF
behavior while generated types are updated from the committed all-feature document.

## Time and serialization

Pydantic models serialize datetimes as ISO-8601 values. Persisted server timestamps are
timezone-aware UTC values; date-only fields remain date-only. New response schemas must map
ORM objects into API-owned Pydantic models rather than returning ORM instances as public
contracts.
