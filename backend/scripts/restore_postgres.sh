#!/usr/bin/env bash
set -euo pipefail

if [[ "${CONFIRM_RESTORE:-}" != "YES" ]]; then
  echo "Refusing restore: set CONFIRM_RESTORE=YES for an isolated target" >&2
  exit 2
fi
: "${BACKUP_FILE:?BACKUP_FILE is required}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"
pg_restore --clean --if-exists --no-owner --dbname \
  "${TARGET_DATABASE_URL/postgresql+asyncpg:\/\//postgresql:\/\/}" "$BACKUP_FILE"
