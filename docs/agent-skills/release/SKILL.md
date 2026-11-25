---
name: release
description: Prepare a safe migration, deployment, and rollback handoff.
---

Review the diff, lockfiles, generated API artifacts, migration SQL, config/secrets,
health checks, backups, worker compatibility, and rollout order. Run required gates,
document unavailable infrastructure checks honestly, preserve the previous image,
and use forward-fix migrations. Never run destructive restore or volume commands on
an existing environment without explicit review.
