# Local validation

## Clean installation

```sh
UV_CACHE_DIR=/tmp/fullstack-blueprint-uv-cache \
NPM_CONFIG_CACHE=/tmp/fullstack-blueprint-npm-cache \
make setup
```

## Static checks and tests

```sh
make check
make test
make coverage
make security-audit
cd frontend && npm run build
backend/.venv/bin/python backend/scripts/check_architecture.py
cd frontend && npm run api:check
```

For a complete security baseline, run `cd frontend && npm audit --json`. Treat moderate findings as release-review items even though the repository's `npm run audit` threshold is high.

`make security-audit` exports the locked uv graph, runs `pip-audit --strict`, and applies the existing high-severity npm audit gate. CI additionally runs Gitleaks, Trivy filesystem vulnerability scanning, and CodeQL. These scans are intentionally separated so dependency, secret, filesystem, and code analysis findings are not silently substituted for one another.

The pre-commit hooks use local locked tools:

```sh
pre-commit run --all-files
pre-commit run --all-files --hook-stage pre-push
```

Export the deployment-specific OpenAPI profile when reviewing a runtime configuration:

```sh
backend/.venv/bin/python backend/scripts/export_openapi.py \
  --profile runtime --output /tmp/runtime-openapi.json
```

## Service-dependent validation

Use disposable services only:

```sh
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env
cp -n infra/.env.example infra/.env
make infra-up
make migrate
```

The Phase 02 migration adds `outbox_events` and `outbox_consumer_receipts`. Validate it
against disposable PostgreSQL/pgvector before applying it to an existing environment;
never run destructive volume or migration commands against retained data.

Run API smoke tests and browser tests against that isolated stack. Stop the stack with `make infra-down`; do not remove volumes unless the environment is explicitly disposable and the action is approved.

## Failure classification

- `PASSED`: command completed successfully.
- `FAILED`: command executed and product/repository behavior failed.
- `BLOCKED`: command could not run because required infrastructure/tooling was unavailable.
- `SKIPPED`: test explicitly skipped by its own precondition.

