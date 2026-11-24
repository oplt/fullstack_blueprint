.DEFAULT_GOAL := check
include Makefile.local

.PHONY: setup backend-sync backend-lock backend-lock-check lint format check test test-backend test-frontend check-types api-contract-check

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

api-contract-check:
	cd frontend && npm run api:check

check: backend-lock-check lint check-types api-contract-check
	$(VENV)/ruff format --check backend

test: test-backend test-frontend

test-backend:
	$(VENV)/python -m pytest backend

test-frontend:
	cd frontend && npm test
