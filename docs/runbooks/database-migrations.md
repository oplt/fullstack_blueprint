# Database migrations

## Preflight

1. Review the migration and generated SQL.
2. Confirm the target database is disposable for validation or has a tested backup/restore path.
3. Run `cd backend && .venv/bin/alembic check`.
4. Validate the migration against disposable PostgreSQL with pgvector.
5. Check indexes, constraints, data movement, lock duration, and downgrade/recovery instructions.

## Apply

```sh
cd backend
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/alembic heads
```

Do not run `upgrade`, downgrade, volume removal, or schema reset against an existing environment as part of a refactor without an approved deployment plan.

## Recovery

- Prefer forward-fix migrations for data-bearing environments.
- Restore from the verified backup if a migration cannot be safely repaired forward.
- Record the deployed revision, migration logs, data checks, and rollback decision in the phase changelog.
- Keep the previous application version available until post-migration smoke checks pass.

