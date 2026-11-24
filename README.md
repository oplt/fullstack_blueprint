# Fullstack Blueprint

A modular FastAPI and React application with accounts, projects, task management, and administration. Optional features include AI Studio, agents, document retrieval and memory.

The backend uses Pydantic Settings, async SQLAlchemy, PostgreSQL with pgvector, Alembic, Redis, and Celery. The frontend uses React, TypeScript, Vite, Material UI, React Router, TanStack Query, React Hook Form, and Zod. Vitest, Playwright, Ruff, and pytest cover development and validation.

## Get started

Use Python 3.12–3.14, uv, Node.js 22.13+ or 24, npm, Make, and Docker Compose v2. The reference setup uses Python 3.14 and Node 24.

From a fresh clone, run:

```sh
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env
cp -n infra/.env.example infra/.env
make setup
make infra-up
make migrate
make dev
```

Open the frontend at `http://localhost:5173`, API docs at `http://localhost:8000/docs`, and readiness at `http://localhost:8000/health/ready`. Register and sign in from the frontend. For a development administrator, set a unique `ADMIN_SIGNUP_INVITE_CODE` in `backend/.env`, restart the API, and enter the code when registering. Keep the invite code out of client configuration and remove it when provisioning is done.

`make setup` runs `uv sync --locked` under `backend/` and `npm ci` under `frontend/`. To select a specific interpreter, run `cd backend && uv sync --locked --python 3.13`. The uv lockfile is authoritative. `make backend-lock` regenerates the lock and exports the core production requirements.

## Database and infrastructure

Compose starts PostgreSQL and Redis with health checks and project-scoped volumes. `make infra-down` stops the stack and keeps its volumes. Change host ports in `infra/.env` and match them in `backend/.env` when running multiple clones. `make dev BACKEND_PORT=8001 FRONTEND_PORT=5174` changes application ports. Update `FRONTEND_URL` for verification and reset links.

With existing PostgreSQL and Redis services, set the connection URLs and run `make migrate` followed by `make dev`. The server must ship pgvector. On a new database, either provision the extension as a database administrator or give the migration role permission to create it. The blueprint migration includes a typed vector column, cosine HNSW, and full-text indexing even with RAG disabled.

```sh
cd backend
.venv/bin/alembic upgrade head
.venv/bin/alembic current
.venv/bin/alembic heads
.venv/bin/alembic check
```

The baseline starts a new schema. To carry data from an earlier application, provision a separate database, map retained entities and foreign keys, and validate the transfer before switching over. Keep the original database and its migration history intact.

## Optional features

| Feature | Configuration |
| --- | --- |
| AI Studio and agents | Set `AI_ENABLED=true` and enable the AI platform module. The built-in heuristic provider supports local development. Configure a supported provider and its model and credentials for production generation. |
| RAG | Install with `make backend-sync BACKEND_EXTRAS="--extra rag"`, set `RAG_ENABLED=true`, configure private S3 storage, and choose an embedding provider. Keep dimensions at 1536 for the baseline unless you migrate and rebuild the index. RAG owns document ingestion for both its API and the AI document UI. |
| Memory | Set `MEMORY_ENABLED=true`. For durable memory, install the SDK with `make backend-sync BACKEND_EXTRAS='--extra memory'` and supply the intended hosted, self-hosted, or OSS configuration. |
| Calendar | Enabled by default. Set `CALENDAR_ENABLED=false` to remove it from API and UI. |
| Email and worker | Add `mail` to `COMPOSE_PROFILES`, set `SMTP_HOST=localhost`, `SMTP_PORT=1025`, and `SMTP_TLS=false` for Mailpit. Use `make worker` with `CELERY_TASK_ALWAYS_EAGER=false` for queued email, ingestion, evaluation, and memory extraction. |
| Object storage | Add `storage` to `COMPOSE_PROFILES`, install the `storage` extra, and run `make infra-up`. Set the bucket, endpoint, and credentials in `backend/.env`. The example profile uses `http://localhost:9000`. |
| PDF extensions | Optional `pdf` and `pdf-ocr` extras add PyMuPDF and OCR adapters. OCR also requires the Tesseract executable. |
| Observability | Set `OBSERVABILITY_ENABLED=true`, configure the exporters and dashboard URLs, and use the supplied Prometheus, Grafana, and Tempo configuration. Set `SENTRY_DSN` to enable Sentry separately. See [observability/README.md](observability/README.md). |

For deployments, build the backend with `docker build -f infra/backend.Dockerfile -t fullstack-blueprint .` and use the same image for migrations and Celery. Supply production settings at runtime. Serve `frontend/dist` with SPA history fallback and proxy `/api` to the backend on the same HTTPS origin. Enable secure cookies, rotate the JWT secret, set explicit HTTPS origins, and configure trusted proxies only for your actual proxy addresses. Cookie names must agree with the frontend CSRF setting. Set `WEBHOOK_ALLOWED_HOSTS` to the exact trusted destinations for production webhook delivery and enforce outbound network policy at deployment.

For a deployment with a read-only home directory, export a writable `MEM0_DIR` in the process environment before starting the API or worker. Set `MEM0_TELEMETRY=false` there to disable SDK telemetry.

## Validate

```sh
make check
make test
cd frontend
npm run build
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

Run browser tests against disposable services. Enable `E2E_RELAX_RATE_LIMITS=true` on a test backend for repeated runs. Supply `E2E_BASE_URL` and `E2E_API_URL` for nondefault ports. The provisioned specs use `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` and `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`. Set `E2E_AI_RAG=1` to include storage-backed AI and RAG tests. Set `BLUEPRINT_TEST_API_URL=http://localhost:8000/api/v1` for backend live project tests. Those tests create disposable users and projects.

## Extend or rename

- `backend/api` composes routes, middleware, and dependencies. `backend/core`, `backend/db`, and `backend/lib` provide shared infrastructure. Business and platform modules live in `backend/modules`, worker entry points in `backend/workers`, and database migrations in `backend/alembic`.
- Use `backend/modules/projects` and the project task CRUD flow as the reference. Define SQLAlchemy models, schemas, repository, service, authorization, and router. Register models in `backend/alembic/env.py`, register the router under `backend/api/router.py`, and create an Alembic revision.
- Add frontend API methods under `frontend/src/api`, query keys under `frontend/src/config`, and frontend feature components and hooks under `frontend/src/features`. Use a lazy page route, existing MUI tokens, and shared loading/error/empty states.
- Projects are also a tenancy boundary for optional integrations. To remove only the reference task feature, remove task routes and task UI, remove the calendar task integration, and add a follow-up migration if you intend to remove task storage. Preserve projects and memberships if AI, RAG, or memory still uses project scope.
- Rename the app with `APP_NAME`, the platform branding setting for existing instances, and the browser and PWA titles in `frontend/index.html` and `frontend/vite.config.ts`. Update Compose defaults, package metadata, cookie names, and the telemetry service name when appropriate.
- To make a GitHub template, publish this blueprint in your own repository, enable **Template repository** in its GitHub settings, and use **Use this template** to create an independent repository.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API fails during startup | Check PostgreSQL and Redis readiness, `backend/.env`, and the Alembic revision. |
| Migration cannot find `vector` | Use a pgvector-enabled server and confirm that the migration role can create the extension if it is absent. |
| Browser receives CSRF errors | Check frontend and backend cookie names, cookie domain, frontend origin, and HTTPS setting. Avoid mixing `localhost` and `127.0.0.1` in browser URLs. |
| No email arrives | Check SMTP settings, worker mode, and Mailpit when using its profile. |
| Documents stay queued | Check worker logs, queue wiring, object storage, and embedding provider configuration. |

See [DESIGN.md](DESIGN.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [AGENTS.md](AGENTS.md).

This repository was derived from [oplt/text_analysis](https://github.com/oplt/text_analysis).
# fullstack_blueprint
