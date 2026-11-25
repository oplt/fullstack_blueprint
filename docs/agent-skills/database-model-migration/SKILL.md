---
name: database-model-migration
description: Add SQLAlchemy persistence and an additive Alembic revision safely.
---

Register models in Alembic, use safe defaults for existing rows, and include indexes,
foreign keys, constraints, and tenant keys. Preserve historical migrations and data.
Render offline SQL, validate on disposable PostgreSQL/pgvector, and test ownership,
tenant isolation, and forward-fix rollback behavior.
