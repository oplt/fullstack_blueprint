---
name: tests
description: Add regression, contract, security, or integration tests.
---

Start with the smallest deterministic unit/contract test, then cover authorization,
tenant isolation, disabled capabilities, idempotency, failure/retry, and retained
behavior. Use isolated services for live API/Playwright tests. Run `make check`,
`make test`, the frontend build, and migration/OpenAPI checks appropriate to scope.
