# Backup and restore

Backups are taken with the same major PostgreSQL/pgvector family as production:

```bash
BACKUP_FILE=/secure/backups/blueprint-$(date -u +%Y%m%dT%H%M%SZ).dump \
  DATABASE_URL="$DATABASE_URL" bash backend/scripts/backup_postgres.sh
pg_restore --list "$BACKUP_FILE" >/dev/null
```

Restore only into an isolated, disposable target after confirming
`CONFIRM_RESTORE=YES`:

```bash
CONFIRM_RESTORE=YES BACKUP_FILE="$BACKUP_FILE" \
  TARGET_DATABASE_URL="$ISOLATED_DATABASE_URL" \
  bash backend/scripts/restore_postgres.sh
```

Run `alembic upgrade head`, application smoke tests, row-count/foreign-key checks,
and a representative RAG retrieval check against the restored target before any
cutover. Never point restore or volume-removal commands at an existing environment
without a reviewed change plan. The current execution environment has no Docker
daemon, so this phase records the procedure and CI/deployment verification remains
required.
