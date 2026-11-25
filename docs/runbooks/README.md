# Runbooks

Runbooks are operational procedures for local development, validation, migration, and rollback. Never point destructive migration or volume commands at an existing environment without an explicit, reviewed change plan.

| Runbook | Use |
| --- | --- |
| [`local-validation.md`](local-validation.md) | Repeat the Phase 00 install, static, test, contract, build, and dependency checks |
| [`database-migrations.md`](database-migrations.md) | Validate and apply additive Alembic migrations safely |

