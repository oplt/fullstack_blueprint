#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"
mkdir -p "$(dirname "$BACKUP_FILE")"
pg_dump --format=custom --no-owner --file="$BACKUP_FILE" \
  "${DATABASE_URL/postgresql+asyncpg:\/\//postgresql:\/\/}"
pg_restore --list "$BACKUP_FILE" >/dev/null
echo "Backup verified: $BACKUP_FILE"
