.DEFAULT_GOAL := check
include Makefile.local

.PHONY: setup backend-sync backend-lock backend-lock-check lint format check check-types typecheck architecture-check coverage test test-backend test-frontend api-contract-check blueprint-check phase11-check security-audit load-test backup restore

setup: backend-sync
	cd frontend && npm ci

backend-sync:
	cd backend && uv sync --locked $(BACKEND_EXTRAS)

backend-lock:
	cd backend && uv lock
	cd backend && uv export --locked --no-dev --no-emit-project -o requirements.txt

backend-lock-check:
	cd backend && uv lock --check

lint:
	$(VENV)/ruff check backend
	cd frontend && npm run lint

format:
	$(VENV)/ruff format backend

check-types:
	cd frontend && ./node_modules/.bin/tsc -b

typecheck:
	cd backend && uv run --locked --all-extras pyright -p pyproject.toml

architecture-check:
	$(VENV)/lint-imports .importlinter --no-cache
	$(VENV)/python backend/scripts/check_architecture.py

api-contract-check:
	cd frontend && npm run api:check
	cd backend && uv run --locked --all-extras python scripts/export_openapi.py --output /tmp/fullstack-blueprint-runtime-openapi.json --profile runtime
	cd backend && uv run --locked --all-extras python scripts/validate_openapi.py --input /tmp/fullstack-blueprint-runtime-openapi.json

blueprint-check:
	$(VENV)/python -m backend.blueprint.cli validate --config blueprint.yml
	$(VENV)/python -m pytest backend/blueprint/tests -q

phase11-check:
	@reference_output=$$(mktemp -d /tmp/fullstack-blueprint-phase11.XXXXXX); \
	$(VENV)/python -m backend.blueprint.cli reference-apps --output $$reference_output; \
	echo "Reference applications generated at $$reference_output"

check: backend-lock-check lint typecheck architecture-check check-types api-contract-check
	$(VENV)/ruff format --check backend

coverage:
	$(VENV)/python -m pytest backend --cov=backend --cov-report=term-missing --cov-report=xml:backend/coverage.xml

security-audit:
	cd backend && uv export --locked --all-extras --no-emit-project --output-file /tmp/fullstack-blueprint-requirements.txt >/dev/null
	cd backend && uv run pip-audit --strict --cache-dir /tmp/fullstack-blueprint-pip-audit-cache --requirement /tmp/fullstack-blueprint-requirements.txt
	cd frontend && npm audit --audit-level=high

load-test:
	k6 run k6/phase09.js

backup:
	bash backend/scripts/backup_postgres.sh

restore:
	bash backend/scripts/restore_postgres.sh

test: test-backend test-frontend

test-backend:
	$(VENV)/python -m pytest backend

test-frontend:
	cd frontend && npm test
