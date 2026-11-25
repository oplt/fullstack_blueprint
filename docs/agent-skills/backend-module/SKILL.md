---
name: backend-module
description: Create a modular-monolith backend module with explicit boundaries.
---

Define domain models and ports without importing API or infrastructure layers.
Put decisions in services and persistence in repositories. Add capability metadata,
feature gating, authorization, tenant ownership, migrations, and focused tests.
Run architecture checks, backend tests, and OpenAPI validation. Do not put SQL in
route handlers or duplicate an existing capability.
