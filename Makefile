.DEFAULT_GOAL := help
SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
VENV ?= $(CURDIR)/backend/.venv/bin
VENV_BIN := $(abspath $(VENV))
BACKEND_PYTHON ?= $(VENV_BIN)/python
BACKEND_PORT ?= 8000
FRONTEND_PORT ?= 5173
DEV_OPEN ?= 1
DEV_WORKER ?= 0
DEV_READY_TIMEOUT ?= 90
BACKEND_RELOAD ?= 1
# uv installs into the same environment used by Make.
export UV_PROJECT_ENVIRONMENT := $(abspath $(VENV_BIN)/..)
# Quality gates use Python assertions; never let inherited optimization disable them.
override export PYTHONOPTIMIZE := 0
COMPOSE_FILE ?= infra/docker-compose.yml
COMPOSE ?= docker compose --project-directory . -f "$(COMPOSE_FILE)" $(if $(wildcard infra/.env),--env-file infra/.env)
COMPOSE_PROFILES ?=
override IMAGE_SEVERITY := HIGH,CRITICAL
override LICENSE_SEVERITY := UNKNOWN,HIGH,CRITICAL
# Local test defaults; immutable digests are required by release.
POSTGRES_TEST_IMAGE ?= pgvector/pgvector:pg18
REDIS_TEST_IMAGE ?= redis:7-alpine
PREVIOUS_DB_REVISION ?=
PREVIOUS_OPENAPI ?=
PRODUCTION_BASE_URL ?=
PRODUCTION_API_URL ?=
PRODUCTION_E2E_CONFIRM ?= 0
override RAG_RECALL_MIN := 0.65
override RAG_MRR_MIN := 0.60
override RAG_NDCG_MIN := 0.55
RELEASE_IMAGE_REF ?=
RELEASE_CERT_IDENTITY ?=
RELEASE_CERT_ISSUER ?= https://token.actions.githubusercontent.com
export RELEASE_IMAGE_REF RELEASE_CERT_IDENTITY RELEASE_CERT_ISSUER
# Extra tools are installed/pinned by CI, never silently downloaded here.
SAST_CONFIG ?= p/default

E2E_BACKEND_PORT ?= 18000
E2E_FRONTEND_PORT ?= 15173
PWA_PORT ?= 14173
ARTIFACTS ?= .audit-artifacts
ARTIFACT_DIR := $(abspath $(ARTIFACTS))
export BACKEND_PYTHON BACKEND_PORT FRONTEND_PORT DEV_OPEN BACKEND_RELOAD DEV_WORKER DEV_READY_TIMEOUT
export PREVIOUS_DB_REVISION PREVIOUS_OPENAPI PRODUCTION_BASE_URL PRODUCTION_API_URL PRODUCTION_E2E_CONFIRM RAG_RECALL_MIN RAG_MRR_MIN RAG_NDCG_MIN

# Public selectors are only for genuinely different operational actions.
ACTION ?= check
UPGRADE ?= 0
# Indirect recursive call prevents mixed operational recipes executing during make -n.
MAKE_CMD = $(MAKE)
export ACTION UPGRADE
# Internal release context; not a public quality profile.
_RELEASE ?= 0
.NOTPARALLEL:

# Use explicit tool checks instead of auto-installing on each invocation.
define require
	@missing=0; \
	for tool in $(1); do \
		if ! command -v "$$tool" >/dev/null 2>&1; then \
			echo "ERROR: Missing $$tool"; \
			missing=1; \
		fi; \
	done; \
	exit $$missing
endef

define ports_free
"$(BACKEND_PYTHON)" -c 'import socket,sys; raw=sys.argv[1:]; sys.exit("Use TCP ports in 1..65535, without leading zeros") if any(not p.isascii() or not p.isdecimal() or p.startswith("0") or len(p)>5 or not 1<=int(p)<=65535 for p in raw) else None; ports=list(map(int,raw)); sys.exit("Use distinct TCP ports") if len(set(ports))!=len(ports) else None; sockets=[]; exec("for p in ports:\n s=socket.socket()\n s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)\n try: s.bind((\"127.0.0.1\",p)); s.listen(1)\n except OSError as e: sys.exit(f\"Port {p} unavailable: {e}. Stop its owner or change ports.\")\n sockets.append(s)")' $(foreach port,$(1) $(2),"$(port)")
endef

# Reused process/readiness functions (no generated shell files).
define process_helpers
stop_group() { local pid="$$1" end; [[ -n $$pid ]] || return 0; kill -TERM -- "-$$pid" 2>/dev/null || kill -TERM "$$pid" 2>/dev/null || true; end=$$((SECONDS+15)); while { kill -0 -- "-$$pid" 2>/dev/null || kill -0 "$$pid" 2>/dev/null; } && ((SECONDS<end)); do sleep .2; done; kill -KILL -- "-$$pid" 2>/dev/null || kill -KILL "$$pid" 2>/dev/null || true; wait "$$pid" 2>/dev/null || true; }; \
http_ok() { local code; code=$$(curl --noproxy '*' -fsS --max-time "$$1" -o /dev/null -w '%{http_code}' "$$2" 2>/dev/null) && [[ $$code == 2[0-9][0-9] ]]; }; \
wait_http() { local pid="$$1" timeout="$$2" url remaining end; shift 2; end=$$((SECONDS+timeout)); while ((SECONDS<end)); do if [[ -n $$pid ]] && ! kill -0 "$$pid" 2>/dev/null; then return 1; fi; local ok=1; for url in "$$@"; do remaining=$$((end-SECONDS)); if ((remaining<=0)) || ! http_ok "$$((remaining<2?remaining:2))" "$$url"; then ok=0; break; fi; done; ((ok)) && return 0; sleep .2; done; return 1; }
endef

# Use identical Alembic import path and validated, explicit environment in every suite.
define alembic_run
(cd backend && PYTHONPATH="$(CURDIR)$${PYTHONPATH:+:$$PYTHONPATH}" "$(BACKEND_PYTHON)" -m alembic $(1))
endef

# Pytest markers are registered here until native pyproject configuration is updated.
# Existing unmarked tests remain in the unit suite; integration tests must opt in.
define pytest_markers
--strict-markers -o $$'markers=integration: requires disposable services\nmigration: migration regression\nworker: real worker regression\nsecurity: authorization and security regression\nrag: AI and RAG regression\nproduction: production configuration regression\ntenant_isolation\nauth_security\ncsrf_cors\nrate_limits\nconnection_leaks\nworker_retries\nprompt_injection\ntool_authorization\ndocument_isolation\nmemory_isolation\nmalformed_ingestion\nprovider_resilience\nembedding_compatibility\nai_cost_controls\nanswer_quality'
endef

# Start fresh, loopback-only PostgreSQL/Redis with random host ports and no named
# volumes. Each caller runs in a single shell and owns its cleanup trap.
define isolated_services
$(process_helpers); pg=; redis=; app_pid=; worker_pid=; api_container=; net=; cleanup() { \
  stop_group "$$app_pid"; stop_group "$$worker_pid"; \
  if [[ -n $$api_container ]]; then docker rm -fv "$$api_container" >/dev/null 2>&1 || true; fi; \
  if [[ -n $$redis ]]; then docker rm -fv "$$redis" >/dev/null 2>&1 || echo 'WARNING: Redis cleanup failed' >&2; fi; \
  if [[ -n $$pg ]]; then docker rm -fv "$$pg" >/dev/null 2>&1 || echo 'WARNING: PostgreSQL cleanup failed' >&2; fi; \
  if [[ -n $$net ]]; then docker network rm "$$net" >/dev/null 2>&1 || true; fi; \
}; trap cleanup EXIT; trap 'exit 130' INT; trap 'exit 143' TERM; \
docker_host=$${DOCKER_HOST:-}; if [[ -n $${DOCKER_CONTEXT:-} || -z $$docker_host ]]; then docker_host=$$(docker context inspect --format '{{.Endpoints.docker.Host}}'); fi; \
[[ $$docker_host == unix://* ]] || { echo 'ERROR: Disposable loopback tests require a local Unix-socket Docker daemon' >&2; exit 2; }; \
pg=$$(docker run --rm -d -e POSTGRES_USER=blueprint_test -e POSTGRES_PASSWORD=ephemeral_test_only -e POSTGRES_DB=blueprint_test -p 127.0.0.1::5432 "$(POSTGRES_TEST_IMAGE)"); \
redis=$$(docker run --rm -d -p 127.0.0.1::6379 "$(REDIS_TEST_IMAGE)"); \
pg_port=$$(docker port "$$pg" 5432/tcp | awk -F: 'NR==1 {print $$NF}'); redis_port=$$(docker port "$$redis" 6379/tcp | awk -F: 'NR==1 {print $$NF}'); \
[[ $$pg_port =~ ^[0-9]+$$ && $$redis_port =~ ^[0-9]+$$ ]]; \
end=$$((SECONDS+90)); ready=0; while ((SECONDS<end)); do if timeout 5 docker exec "$$pg" pg_isready -h 127.0.0.1 -U blueprint_test -d blueprint_test >/dev/null 2>&1 && timeout 5 docker exec "$$redis" redis-cli ping | grep -qx PONG; then ready=1; break; fi; sleep 1; done; \
if ((!ready)); then docker logs "$$pg" >&2 || true; docker logs "$$redis" >&2 || true; echo 'ERROR: Disposable services did not become ready' >&2; exit 1; fi; \
export APP_ENV=test DATABASE_URL="postgresql+asyncpg://blueprint_test:ephemeral_test_only@127.0.0.1:$$pg_port/blueprint_test" REDIS_URL="redis://127.0.0.1:$$redis_port/0"; \
export JWT_SECRET=$$("$(BACKEND_PYTHON)" -c 'import secrets; print(secrets.token_urlsafe(48))') JWT_ALGORITHM=HS256 ACCESS_TOKEN_EXPIRE_MINUTES=15 REFRESH_TOKEN_EXPIRE_DAYS=7 LOG_TO_FILE=false; \
export CELERY_TASK_ALWAYS_EAGER=true CELERY_BROKER_URL="$$REDIS_URL" CELERY_RESULT_BACKEND="$$REDIS_URL" STORAGE_BUCKET= SMTP_HOST= SENTRY_DSN= OTLP_ENDPOINT= OBSERVABILITY_ENABLED=false AI_ENABLED=false RAG_ENABLED=false MEMORY_ENABLED=false; \
unset RAG_INTEGRATION_DATABASE_URL E2E_TEST_EMAIL E2E_TEST_PASSWORD E2E_ADMIN_EMAIL E2E_ADMIN_PASSWORD E2E_AI_RAG; \
export HEALTH_READY_PUBLIC=true WORKER_HEALTH_REQUIRED=false COOKIE_SECURE=false REQUIRE_EMAIL_VERIFICATION=false COOKIE_DOMAIN= COOKIE_SAMESITE=lax ADMIN_SIGNUP_INVITE_CODE= ALLOWED_HOSTS=localhost,127.0.0.1 TRUSTED_PROXY_IPS= AI_MCP_ENABLED=false INTEGRATIONS_ENABLED=false ANALYTICS_ENABLED=false ANALYTICS_POSTHOG_ENABLED=false AI_DEFAULT_PROVIDER=local AI_EMBEDDING_PROVIDER=local; \
export OPENAI_API_KEY=''; \
export ANTHROPIC_API_KEY=''
endef

# No test-suite selectors: fixed, disjoint backend test selections.
PYTEST = "$(BACKEND_PYTHON)" -m pytest -c backend/pyproject.toml backend $(pytest_markers)

# Run each runtime cohort once. Require a passing test for every risk marker,
# and reject skips in mandatory cohorts. Priority: production > worker > AI > integration.
CORE_MARKERS := integration security migration tenant_isolation auth_security csrf_cors rate_limits connection_leaks
AI_MARKERS := rag prompt_injection tool_authorization document_isolation memory_isolation malformed_ingestion provider_resilience embedding_compatibility ai_cost_controls answer_quality
WORKER_MARKERS := worker worker_retries
join_or = $(subst $(space), or ,$(strip $(1)))
empty :=
space := $(empty) $(empty)
NON_UNIT := $(call join_or,production $(WORKER_MARKERS) $(AI_MARKERS) $(CORE_MARKERS))
define mandatory_tests
"$(BACKEND_PYTHON)" -c 'import sys,pytest; required=set(sys.argv[1].split()); seen=set(); skipped=[]; exec("class Evidence:\n def pytest_runtest_logreport(self, report):\n  if report.skipped: skipped.append(report.nodeid)\n  if report.when == \"call\" and report.passed: seen.update(required.intersection(report.keywords))"); result=pytest.main(sys.argv[2:],plugins=[Evidence()]); missing=required-seen; print("Missing required markers:",sorted(missing)) if missing else None; print("Skipped mandatory tests:",skipped) if skipped else None; sys.exit(int(result) or int(bool(missing or skipped)))' "$(1)" -c backend/pyproject.toml backend $(pytest_markers) -m "$(2)" --no-cov --junitxml="$(ARTIFACT_DIR)/$(3)-junit.xml"
endef

# Primary commands; compatibility targets are defined below.
ifneq ($(strip $(foreach v,LEVEL SUITE MODE TARGET DEAD_CODE_MODE,$(if $(filter command,$(origin $(v))),$(v)))),)
$(error Removed quality selectors: use make check, make test or make build without LEVEL/SUITE/MODE/TARGET/DEAD_CODE_MODE)
endif
help: ## Show available commands.
	@awk 'BEGIN {FS=":.*## "} /^[a-zA-Z][a-zA-Z0-9-]*:.*## / {printf "  %-13s %s\n", $$1,$$2}' Makefile
	@printf '\nOperational selectors: infra/db ACTION=...; update UPGRADE=1. See command descriptions.\n'

doctor: _host-versions ## Validate all local, security and release tools and configuration.
	$(call require,uv node npm git curl docker)
	@uv --version; node --version; npm --version; docker compose version; docker info --format '{{.ServerVersion}}'
	@docker compose up --help | grep -- --wait-timeout >/dev/null || { echo 'Docker Compose must support --wait-timeout' >&2; exit 2; }
	@for f in backend/pyproject.toml backend/uv.lock frontend/package.json frontend/package-lock.json "$(COMPOSE_FILE)" Procfile.dev; do test -f "$$f" || { echo "ERROR: Missing $$f" >&2; exit 2; }; done
	@if [[ -x "$(BACKEND_PYTHON)" ]]; then $(MAKE_CMD) _versions _dev-config; else echo "INFO: Backend environment absent; run make setup"; fi
	$(call require,gitleaks trivy k6 setsid timeout pg_dump pg_restore psql shellcheck semgrep actionlint zizmor prettier oasdiff lighthouse zap-baseline.py hadolint cosign)
	$(COMPOSE) --profile '*' config --quiet

setup: ## Initialize missing env files, install and validate.
	@for d in backend frontend infra; do if [[ -f "$$d/.env.example" && ! -e "$$d/.env" && ! -L "$$d/.env" ]]; then (umask 077; cp -n "$$d/.env.example" "$$d/.env"); echo "Created $$d/.env; review it before starting"; fi; done
	+$(MAKE) install
	+$(MAKE) _versions _dev-config

install: _host-versions ## Install locked dependencies and all browser engines.
	cd backend && uv sync --locked --all-extras $(if $(filter 1,$(_RELEASE)),--reinstall)
	cd frontend && npm ci
	cd frontend && ./node_modules/.bin/playwright install chromium firefox webkit

update: ## Refresh lockfiles and requirements; UPGRADE=1 upgrades allowed versions.
	$(call require,uv npm)
	@case "$$UPGRADE" in 0) cd backend && uv lock ;; 1) cd backend && uv lock --upgrade ;; *) echo 'UPGRADE=0|1' >&2; exit 2;; esac
	cd backend && uv export --quiet --locked --no-dev --no-emit-project -o requirements.txt
	@cd frontend; if [[ $$UPGRADE = 1 ]]; then npm update --package-lock-only --ignore-scripts; else npm install --package-lock-only --ignore-scripts; fi
	@echo 'Review lockfile changes, then run make install and make check.'

dev: _ports _db-check ## Start API/Vite and optionally Celery (DEV_WORKER=1).
	@case "$$DEV_WORKER" in 0) exec "$(VENV_BIN)/honcho" -e /dev/null -f Procfile.dev start backend frontend ;; 1) exec "$(VENV_BIN)/honcho" -e /dev/null -f Procfile.dev start backend frontend worker ;; *) echo 'DEV_WORKER=0|1' >&2; exit 2;; esac

infra: ## ACTION=up|down|check|status|logs; down preserves volumes.
	@case "$$ACTION" in \
	 up) $(COMPOSE) $(COMPOSE_PROFILES) up -d --wait --wait-timeout 90 ;; \
	 down) $(COMPOSE) $(COMPOSE_PROFILES) down ;; \
	 check) $(COMPOSE) --profile '*' config --quiet ;; \
	 logs) $(COMPOSE) $(COMPOSE_PROFILES) logs --follow --tail=100 ;; \
	 status) $(process_helpers); status=0; for endpoint in "http://127.0.0.1:$(BACKEND_PORT)/health/live" "http://127.0.0.1:$(BACKEND_PORT)/health/ready" "http://127.0.0.1:$(FRONTEND_PORT)/"; do if http_ok 3 "$$endpoint"; then echo "UP $$endpoint"; else echo "DOWN $$endpoint"; status=1; fi; done; $(MAKE_CMD) _db-check || status=1; $(COMPOSE) ps || status=1; exit $$status ;; \
	 *) echo 'ACTION=up|down|check|status|logs' >&2; exit 2 ;; esac

db: ## ACTION=check|migrate|backup|restore; destructive actions require confirmation.
	+@case "$$ACTION" in check|migrate|backup|restore) $(MAKE) "_db-$$ACTION" ;; *) echo 'ACTION=check|migrate|backup|restore' >&2; exit 2;; esac

fix: ## Apply safe backend and frontend corrections.
	"$(VENV_BIN)/ruff" check backend --fix-only
	"$(VENV_BIN)/ruff" format backend
	@status=0; "$(VENV_BIN)/ruff" check backend || status=1; (cd frontend && npm run lint -- --fix) || status=1; exit $$status

test: _backend-test _frontend-test ## Run complete local backend and frontend tests.

check: _backend-check _frontend-check _security-check _infra-check test ## Run all static, security, infrastructure and local test checks.

build: _frontend-check _frontend-build _container-build ## Build and validate frontend, Storybook and containers; generate SBOMs.

clean: ## Remove known generated artifacts; preserve env files and database volumes.
	@rm -rf -- backend/.pytest_cache backend/.ruff_cache backend/.mypy_cache .pytest_cache .ruff_cache .mypy_cache frontend/dist frontend/coverage frontend/playwright-report frontend/test-results frontend/storybook-static frontend/node_modules/.vite .audit-artifacts
	@# Only clean custom artifact directories inside the repository, and only known artifacts.
	@if [[ "$(ARTIFACT_DIR)" != "$(CURDIR)/.audit-artifacts" && "$(ARTIFACT_DIR)" != "$(CURDIR)" && "$(ARTIFACT_DIR)" != / && -d "$(ARTIFACT_DIR)" && ! -L "$(ARTIFACT_DIR)" && $$(realpath -e -- "$(ARTIFACT_DIR)") == "$$(realpath -e -- "$(CURDIR)")/"* ]]; then find "$(ARTIFACT_DIR)" -maxdepth 1 -type f \( -name backend-junit.xml -o -name backend-coverage.xml -o -name backend-db-junit.xml -o -name integration-junit.xml -o -name worker-junit.xml -o -name security-junit.xml -o -name rag-junit.xml -o -name worker.log -o -name dependency-advisories.json -o -name current-openapi.json -o -name zap-report.html -o -name zap-report.json -o -name lighthouse.json -o -name e2e-services.log -o -name pwa-preview.log -o -name rag-evaluation.json -o -name production-image.log -o -name "*.sbom.json" -o -name migration-junit.xml -o -name production-junit.xml -o -name visual-regression-junit.xml -o -name security-headers-junit.xml -o -name accessibility-junit.xml -o -name design-tokens-junit.xml \) -delete; fi

release: ## Install, check, test, build and verify the production candidate.
	+$(MAKE) _release-ready
	+$(MAKE) install _RELEASE=1
	+$(MAKE) check build _production-check _RELEASE=1

# Operational helpers
_migration-check:
	@heads=$$( $(call alembic_run,heads) ); printf '%s\n' "$$heads"; \
	 [[ $$(grep -c '(head)' <<< "$$heads" || true) = 1 ]] || { echo 'ERROR: Expected one Alembic head' >&2; exit 1; }

_host-versions:
	$(call require,uv node npm)
	@node -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<22 || (a===22 && b<13)) process.exit(1)' || { echo 'ERROR: Node >=22.13 required' >&2; exit 2; }

_versions: _host-versions
	@test -x "$(BACKEND_PYTHON)" || { echo 'Run make install first' >&2; exit 2; }
	@"$(BACKEND_PYTHON)" -c 'import sys,tomllib,subprocess; from packaging.specifiers import SpecifierSet; p=tomllib.load(open("backend/pyproject.toml","rb")); req=p["project"]["requires-python"]; uv_req=p.get("tool",{}).get("uv",{}).get("required-version"); uv_ver=subprocess.check_output(["uv","--version"],text=True).split()[1]; sys.exit("Python version must satisfy "+req) if not SpecifierSet(req).contains(".".join(map(str,sys.version_info[:3])),prereleases=True) else None; sys.exit("uv version must satisfy "+uv_req) if uv_req and not SpecifierSet(uv_req).contains(uv_ver,prereleases=True) else None; print("Python and uv version requirements satisfied")'

_dev-config:
	@"$(BACKEND_PYTHON)" -c 'from backend.core.config import settings; import sys; sys.exit("Refusing local operation outside development") if settings.APP_ENV.lower() not in {"dev","development","local"} else None; print("Backend development settings valid")'

_local-ready:
	$(call require,uv node npm curl)
	@test -x "$(BACKEND_PYTHON)" && test -x "$(VENV_BIN)/honcho" || { echo 'ERROR: Run make install first' >&2; exit 2; }
	@test -x frontend/node_modules/.bin/vite || { echo 'ERROR: Run make install first' >&2; exit 2; }

_ports: _versions _local-ready _dev-config
	@[[ $$DEV_OPEN = 0 || $$DEV_OPEN = 1 ]] && [[ $$DEV_WORKER = 0 || $$DEV_WORKER = 1 ]] && [[ $$BACKEND_RELOAD = 0 || $$BACKEND_RELOAD = 1 ]] || { echo "DEV_OPEN, DEV_WORKER and BACKEND_RELOAD must be 0 or 1" >&2; exit 2; }
	@[[ $$DEV_READY_TIMEOUT =~ ^[1-9][0-9]{0,2}$$ ]] && ((DEV_READY_TIMEOUT<=600)) || { echo "DEV_READY_TIMEOUT must be 1..600 seconds" >&2; exit 2; }
	@$(call ports_free,$(BACKEND_PORT),$(FRONTEND_PORT))
	@"$(BACKEND_PYTHON)" -c 'import os,sys; from backend.core.config import settings; sys.exit("Enable DEV_WORKER=1 or disable WORKER_HEALTH_REQUIRED in development") if settings.WORKER_HEALTH_REQUIRED and os.environ["DEV_WORKER"] != "1" else None'

_db-check: _dev-config
	@"$(BACKEND_PYTHON)" -c 'import os,sys,subprocess; from backend.core.config import settings; env=dict(os.environ,DATABASE_URL=str(settings.DATABASE_URL),APP_ENV=settings.APP_ENV,PYTHONPATH=os.getcwd()+os.pathsep+os.environ.get("PYTHONPATH","")); cmd=[sys.executable,"-m","alembic"]; heads=subprocess.check_output(cmd+["heads"],cwd="backend",env=env,text=True,timeout=15).splitlines(); current=subprocess.check_output(cmd+["current"],cwd="backend",env=env,text=True,timeout=20).splitlines(); expected=[x.strip() for x in heads if x.strip().endswith("(head)")]; actual={x.strip() for x in current if x.strip()}; sys.exit("Database not at its single Alembic head. Review and run make db ACTION=migrate MIGRATE_CONFIRM=1") if len(expected)!=1 or actual!=set(expected) else None; print("PostgreSQL: connected; Alembic revision current")'
	@"$(BACKEND_PYTHON)" -c 'from backend.core.config import settings; from redis import Redis; import sys; client=Redis.from_url(str(settings.REDIS_URL),socket_connect_timeout=5,socket_timeout=5); sys.exit("Redis PING failed") if not client.ping() else None; client.close(); print("Redis: connected")'

_db-migrate: _dev-config
	@test "$${MIGRATE_CONFIRM:-0}" = 1 || { echo 'Review backend/.env and DATABASE_URL, then use make db ACTION=migrate MIGRATE_CONFIRM=1' >&2; exit 2; }
	@"$(BACKEND_PYTHON)" -c 'import os,sys,subprocess; from backend.core.config import settings; from urllib.parse import urlsplit; u=urlsplit(str(settings.DATABASE_URL)); sys.exit("Refusing migration outside local development") if settings.APP_ENV.lower() not in {"dev","development","local"} or u.scheme not in {"postgresql","postgresql+asyncpg","postgres"} or u.hostname not in {"localhost","127.0.0.1","::1"} or u.query or u.fragment or not u.path.strip("/") else None; print(f"Migration target: {u.hostname}:{u.port or 5432}{u.path}",flush=True); env=dict(os.environ,DATABASE_URL=str(settings.DATABASE_URL),APP_ENV=settings.APP_ENV,PYTHONPATH=os.getcwd()+os.pathsep+os.environ.get("PYTHONPATH","")); subprocess.run([sys.executable,"-m","alembic","upgrade","head"],cwd="backend",env=env,check=True)'

_db-backup:
	$(call require,pg_dump pg_restore)
	@test -n "$${DATABASE_URL:-}" && test -n "$${BACKUP_FILE:-}" || { echo 'Set DATABASE_URL and BACKUP_FILE in your shell' >&2; exit 2; }
	@test ! -e "$$BACKUP_FILE" && test ! -L "$$BACKUP_FILE" || { echo 'Refusing to overwrite an existing backup' >&2; exit 2; }
	@umask 077; bash backend/scripts/backup_postgres.sh

_db-restore:
	$(call require,pg_restore psql)
	@test "$${CONFIRM_RESTORE:-}" = YES && test -f "$${BACKUP_FILE:-}" && test -n "$${TARGET_DATABASE_URL:-}" || { echo 'Set CONFIRM_RESTORE=YES, BACKUP_FILE and TARGET_DATABASE_URL' >&2; exit 2; }
	@"$(BACKEND_PYTHON)" -c 'import os,re,subprocess,sys; from urllib.parse import urlsplit,unquote; u=urlsplit(os.environ["TARGET_DATABASE_URL"]); host=u.hostname; db=unquote(u.path[1:]); user=unquote(u.username or ""); password=unquote(u.password or ""); valid=u.scheme in {"postgresql","postgres","postgresql+asyncpg"} and host in {"127.0.0.1","::1"} and not u.query and not u.fragment and re.fullmatch(r"[A-Za-z0-9_]+_(test|restore)",db) and re.fullmatch(r"[A-Za-z0-9_]+",user) and bool(password); sys.exit("Refusing unsafe restore URL: use literal loopback, explicit credentials and a *_test or *_restore database, no query/fragment") if not valid else None; env={k:v for k,v in os.environ.items() if not k.startswith("PG")}; env.update(PGPASSWORD=password,PGCONNECT_TIMEOUT="5"); args=["--host",host,"--port",str(u.port or 5432),"--username",user,"--dbname",db,"--no-password"]; identity=subprocess.check_output(["psql",*args,"-XAt","-v","ON_ERROR_STOP=1","-c","SELECT current_database() || chr(124) || host(inet_server_addr())"],env=env,text=True,timeout=15).strip(); allowed={db+"|127.0.0.1",db+"|::1"}; container=os.environ.get("RESTORE_CONTAINER", ""); exec("if container:\n import json\n docker_host=os.environ.get(\"DOCKER_HOST\") or subprocess.check_output([\"docker\",\"context\",\"inspect\",\"--format\",\"{{.Endpoints.docker.Host}}\"],text=True,timeout=10).strip()\n if not docker_host.startswith(\"unix://\"): sys.exit(\"Restore requires a local Docker daemon\")\n info=json.loads(subprocess.check_output([\"docker\",\"inspect\",\"--type\",\"container\",container],text=True,timeout=10))[0]\n mappings=info[\"NetworkSettings\"][\"Ports\"].get(\"5432/tcp\") or []\n if not any(x[\"HostIp\"]==host and x[\"HostPort\"]==str(u.port or 5432) for x in mappings): sys.exit(\"Docker restore port mapping mismatch\")\n allowed={db+\"|\"+a for n in info[\"NetworkSettings\"][\"Networks\"].values() for a in (n.get(\"IPAddress\"),n.get(\"GlobalIPv6Address\")) if a}"); sys.exit("Database identity mismatch") if identity not in allowed else None; dump=os.environ["BACKUP_FILE"]; subprocess.run(["pg_restore","--list", "--",dump],env=env,check=True,stdout=subprocess.DEVNULL); subprocess.run(["pg_restore",*args,"--clean","--if-exists","--no-owner","--no-privileges","--exit-on-error","--single-transaction","--",dump],env=env,check=True)'


_backend-check: _migration-check
	cd backend && uv lock --check
	@tmp=$$(mktemp); trap 'rm -f "$$tmp"' EXIT; cd backend; \
	 uv export --quiet --locked --no-dev --no-emit-project --no-header -o "$$tmp"; \
	 diff -u <(sed '/^# This file was autogenerated by uv/d; /^#    uv export /d' requirements.txt) "$$tmp"
	"$(VENV_BIN)/ruff" check backend
	"$(VENV_BIN)/ruff" format --check backend
	cd backend && "$(VENV_BIN)/pyright" -p pyproject.toml
	"$(VENV_BIN)/lint-imports" --config .importlinter $(if $(CI),--no-cache)
	"$(BACKEND_PYTHON)" backend/scripts/check_architecture.py
	"$(BACKEND_PYTHON)" -m backend.blueprint.cli validate --config blueprint.yml
	cd backend && "$(VENV_BIN)/vulture" --min-confidence 100

_frontend-check:
	cd frontend && npm run lint
	cd frontend && npm run typecheck
	$(call require,prettier)
	cd frontend && prettier --check src
	cd frontend && npm run api:check
	@mkdir -p "$(ARTIFACT_DIR)"; cd backend; \
	 "$(BACKEND_PYTHON)" scripts/export_openapi.py --profile runtime --output "$(ARTIFACT_DIR)/current-openapi.json"; \
	 "$(BACKEND_PYTHON)" scripts/validate_openapi.py --input "$(ARTIFACT_DIR)/current-openapi.json"
	@if [[ "$(_RELEASE)" = 1 ]]; then command -v oasdiff >/dev/null; oasdiff breaking "$$PREVIOUS_OPENAPI" "$(ARTIFACT_DIR)/current-openapi.json" --fail-on ERR; fi
	cd frontend && npm run knip

_infra-check:
	$(COMPOSE) --profile '*' config --quiet
	$(call require,shellcheck git)
	@while IFS= read -r line; do [[ -z $$line ]] || printf '%s\n' "$${line#*: }" | shellcheck --shell=sh -; done < Procfile.dev
	@git ls-files -z '*.sh' | xargs -0 -r shellcheck
	$(call require,actionlint zizmor)
	actionlint
	zizmor --offline .github/workflows
	$(call require,hadolint)
	@find infra -type f -iname '*Dockerfile*' -print0 | xargs -0 -r hadolint

_security-check:
	@tmp=$$(mktemp); trap 'rm -f "$$tmp"' EXIT; cd backend; \
	 uv export --quiet --locked --all-extras --all-groups --no-emit-project --no-hashes -o "$$tmp"; \
	 "$(VENV_BIN)/pip-audit" --strict --no-deps --disable-pip --requirement "$$tmp"
	$(call require,trivy)
	@mkdir -p "$(ARTIFACT_DIR)"
	trivy fs --scanners vuln --exit-code 0 --format json --output "$(ARTIFACT_DIR)/dependency-advisories.json" --skip-dirs .git --skip-dirs backend/.venv --skip-dirs frontend/node_modules --skip-dirs "$(ARTIFACTS)" .
	@"$(BACKEND_PYTHON)" -c 'import json,sys,collections; r=json.load(open(sys.argv[1])); findings=[v for result in (r.get("Results") or []) for v in (result.get("Vulnerabilities") or [])]; counts=collections.Counter(v.get("Severity","UNKNOWN") for v in findings); print("Dependency vulnerability counts:",dict(counts)); [print(v.get("VulnerabilityID"),v.get("PkgName"),v.get("Severity")) for v in findings if v.get("Severity") in {"HIGH","CRITICAL"}]; sys.exit(1 if any(v.get("Severity") in {"HIGH","CRITICAL"} for v in findings) else 0)' "$(ARTIFACT_DIR)/dependency-advisories.json"
	$(call require,gitleaks git)
	@tmp=$$(mktemp -d); trap 'rm -rf "$$tmp"' EXIT; \
	 git ls-files -z --cached --others --exclude-standard | while IFS= read -r -d '' f; do if [[ "$(CURDIR)/$$f" == "$(ARTIFACT_DIR)/"* ]]; then continue; fi; if [[ -f $$f && ! -L $$f ]]; then mkdir -p "$$tmp/$$(dirname "$$f")"; cp -- "$$f" "$$tmp/$$f"; fi; done; \
	 args=(); if [[ -f .gitleaks.toml ]]; then args+=(--config "$(CURDIR)/.gitleaks.toml"); fi; if [[ -f .gitleaksignore ]]; then args+=(--gitleaks-ignore-path "$(CURDIR)/.gitleaksignore"); fi; \
	 gitleaks dir --redact "$${args[@]}" "$$tmp"; gitleaks git --redact "$${args[@]}" --pre-commit --staged .
	gitleaks git --redact --log-opts=--all .
	@# IBM Plex Mono is OFL-1.1; its exact license accompanies the distributed font.
	@cmp frontend/node_modules/@fontsource/ibm-plex-mono/LICENSE frontend/public/licenses/ibm-plex-mono.txt
	trivy fs --scanners license --severity "$(LICENSE_SEVERITY)" --ignored-licenses OFL-1.1 --exit-code 1 --skip-dirs .git --skip-dirs backend/.venv --skip-dirs frontend/node_modules --skip-dirs "$(ARTIFACTS)" .
	trivy config --severity HIGH,CRITICAL --exit-code 1 infra
	$(call require,semgrep)
	semgrep scan --config "$(SAST_CONFIG)" --error --metrics=off backend frontend/src

_test-ready: _local-ready
	$(call require,docker curl timeout setsid)
	@docker info >/dev/null
	@test -x "$(VENV_BIN)/alembic" || { echo 'ERROR: Run make install first' >&2; exit 2; }
	@mkdir -p "$(ARTIFACT_DIR)"

_backend-test: _migration-check _test-ready
	@env -u RAG_INTEGRATION_DATABASE_URL APP_ENV=test DATABASE_URL=postgresql+asyncpg://blueprint@127.0.0.1:1/unused REDIS_URL=redis://127.0.0.1:1/0 CELERY_BROKER_URL=redis://127.0.0.1:1/0 CELERY_RESULT_BACKEND=redis://127.0.0.1:1/0 CELERY_TASK_ALWAYS_EAGER=true JWT_SECRET=$$("$(BACKEND_PYTHON)" -c 'import secrets; print(secrets.token_urlsafe(48))') JWT_ALGORITHM=HS256 ACCESS_TOKEN_EXPIRE_MINUTES=15 REFRESH_TOKEN_EXPIRE_DAYS=7 LOG_TO_FILE=false AI_ENABLED=false RAG_ENABLED=false MEMORY_ENABLED=false STORAGE_BUCKET= SMTP_HOST= OBSERVABILITY_ENABLED=false SENTRY_DSN= AI_MCP_ENABLED=false INTEGRATIONS_ENABLED=false ANALYTICS_ENABLED=false ANALYTICS_POSTHOG_ENABLED=false OPENAI_API_KEY='' AI_DEFAULT_PROVIDER=local AI_EMBEDDING_PROVIDER=local \
	 ANTHROPIC_API_KEY='' $(PYTEST) -m "not ($(NON_UNIT))" --cov=backend --cov-report=term-missing --cov-report=xml:"$(ARTIFACT_DIR)/backend-coverage.xml" --cov-fail-under=80 --junitxml="$(ARTIFACT_DIR)/backend-junit.xml"
	@$(isolated_services); \
	 if [[ -n $$PREVIOUS_DB_REVISION ]]; then [[ $$PREVIOUS_DB_REVISION =~ ^[A-Za-z0-9_]+$$ ]]; $(call alembic_run,upgrade "$$PREVIOUS_DB_REVISION"); fi; \
	 $(call alembic_run,upgrade head); $(call alembic_run,check); \
	 docker exec "$$pg" psql -X -v ON_ERROR_STOP=1 -U blueprint_test -d blueprint_test -c "CREATE TABLE release_restore_probe (value text NOT NULL); INSERT INTO release_restore_probe VALUES ('restore-ok')"; \
	 docker exec "$$pg" pg_dump -U blueprint_test -Fc -f /tmp/blueprint.dump blueprint_test; \
	 docker exec "$$pg" createdb -U blueprint_test blueprint_restore; \
	 docker exec "$$pg" pg_restore -U blueprint_test -d blueprint_restore --exit-on-error --single-transaction --no-owner --no-privileges /tmp/blueprint.dump; \
	 [[ $$(docker exec "$$pg" psql -XAt -U blueprint_test -d blueprint_restore -c 'SELECT value FROM release_restore_probe') = restore-ok ]]; \
	 docker exec "$$pg" psql -X -v ON_ERROR_STOP=1 -U blueprint_test -d blueprint_restore -c 'DROP TABLE release_restore_probe'; \
	 export DATABASE_URL="$${DATABASE_URL%/*}/blueprint_restore"; $(call alembic_run,check); \
	 echo 'Migration, schema drift and disposable backup/restore passed'
	@$(isolated_services); $(call alembic_run,upgrade head); $(call alembic_run,check); \
	 $(call mandatory_tests,$(CORE_MARKERS),($(call join_or,$(CORE_MARKERS))) and not (production or $(call join_or,$(WORKER_MARKERS)) or $(call join_or,$(AI_MARKERS))),integration)
	@$(isolated_services); $(call alembic_run,upgrade head); $(call alembic_run,check); \
	 export CELERY_TASK_ALWAYS_EAGER=false WORKER_HEALTH_REQUIRED=true CELERY_CONCURRENCY=1; setsid "$(BACKEND_PYTHON)" -m backend.workers.run_worker >"$(ARTIFACT_DIR)/worker.log" 2>&1 & worker_pid=$$!; end=$$((SECONDS+45)); ready=0; while ((SECONDS<end)); do kill -0 "$$worker_pid" || break; if timeout 5 "$(BACKEND_PYTHON)" -c 'from backend.workers.celery_app import celery_app; import sys; sys.exit(not bool(celery_app.control.ping(timeout=2)))'; then ready=1; break; fi; sleep 1; done; ((ready)) || { tail -n 60 "$(ARTIFACT_DIR)/worker.log" >&2; exit 1; }; \
	 $(call mandatory_tests,$(WORKER_MARKERS),($(call join_or,$(WORKER_MARKERS))) and not production,worker)
	@$(isolated_services); $(call alembic_run,upgrade head); $(call alembic_run,check); \
	 export AI_ENABLED=true RAG_ENABLED=true RAG_INTEGRATION_DATABASE_URL="$$DATABASE_URL"; \
	 $(call mandatory_tests,$(AI_MARKERS),($(call join_or,$(AI_MARKERS))) and not (production or $(call join_or,$(WORKER_MARKERS))),rag); \
	 "$(BACKEND_PYTHON)" -m backend.modules.rag.eval.run_end_to_end --report "$(ARTIFACT_DIR)/rag-evaluation.json" --generate; \
	 "$(BACKEND_PYTHON)" -c 'import json,os,sys,statistics as st; r=json.load(open(sys.argv[1])); cases=r["cases"]; positive=[x for x in cases if not x["no_answer_expected"]]; assert positive and len(cases)==r["case_count"], "Missing benchmark cases"; bounds={"recall_at_10":"RAG_RECALL_MIN","mrr":"RAG_MRR_MIN","ndcg_at_10":"RAG_NDCG_MIN"}; assert all(0<=float(os.environ[v])<=1 and st.mean(c[k] for c in positive)>=float(os.environ[v]) for k,v in bounds.items()), "Retrieval quality below policy"; assert all(c["citation_validation_status"] not in {"NOT_RUN", "unstructured"} and c["citation_structural_validity"]==1 and c["unsupported_claim_rate"]==0 for c in cases), "Structural citation gate failed"; print("RAG retrieval and structural citation gate passed")' "$(ARTIFACT_DIR)/rag-evaluation.json"
	@$(isolated_services); $(call alembic_run,upgrade head); $(call alembic_run,check); \
	 export APP_ENV=production COOKIE_SECURE=true RATE_LIMIT_FAIL_OPEN=false LOG_FORMAT=json FRONTEND_URL=https://localhost CORS_ALLOWED_ORIGINS=https://localhost ALLOWED_HOSTS=localhost,127.0.0.1 JWT_SECRET=$$("$(BACKEND_PYTHON)" -c 'import secrets; print(secrets.token_urlsafe(48))'); \
	 $(call mandatory_tests,production,production,production)

_frontend-build:
	cd frontend && npm run build
	cd frontend && npm run pwa:check
	cd frontend && npm run perf:check
	cd frontend && npm run storybook:build

_frontend-test: _test-ready _frontend-build
	@test -f frontend/src/components/ui/a11y.axe.test.tsx && test -f frontend/src/components/ui/a11y.phase21.test.tsx
	cd frontend && CI=true npm run test:coverage -- --coverage.thresholds.lines=80 --coverage.thresholds.branches=80 --coverage.thresholds.functions=80 --coverage.thresholds.statements=80
	@$(call ports_free,$(E2E_BACKEND_PORT),$(E2E_FRONTEND_PORT))
	@$(isolated_services); \
	 export APP_ENV=dev BACKEND_PORT=$(E2E_BACKEND_PORT) FRONTEND_PORT=$(E2E_FRONTEND_PORT) DEV_OPEN=0 DEV_WORKER=0 BACKEND_RELOAD=0 DEV_READY_TIMEOUT=90 E2E_RELAX_RATE_LIMITS=false; \
	 export FRONTEND_URL="http://127.0.0.1:$$FRONTEND_PORT" CORS_ALLOWED_ORIGINS="http://127.0.0.1:$$FRONTEND_PORT,http://localhost:$$FRONTEND_PORT" E2E_API_URL="http://127.0.0.1:$$BACKEND_PORT" E2E_BASE_URL="http://127.0.0.1:$$FRONTEND_PORT"; \
	 export E2E_WORKERS=1 PROJECTS_ENABLED=true ADMIN_API_ENABLED=false VITE_API_BASE=/api/v1 VITE_CSRF_COOKIE_NAME=blueprint_csrf VITE_CSRF_HEADER_NAME=X-CSRF-Token CSRF_COOKIE_NAME=blueprint_csrf CSRF_HEADER_NAME=X-CSRF-Token ACCESS_COOKIE_NAME=blueprint_access REFRESH_COOKIE_NAME=blueprint_refresh E2E_ACCESS_COOKIE=blueprint_access E2E_CSRF_COOKIE=blueprint_csrf; \
	 $(call alembic_run,upgrade head); $(call alembic_run,check); \
	 mkdir -p "$(ARTIFACT_DIR)"; setsid "$(VENV_BIN)/honcho" -e /dev/null -f Procfile.dev start backend frontend >"$(ARTIFACT_DIR)/e2e-services.log" 2>&1 & app_pid=$$!; \
	 wait_http "$$app_pid" 120 "$$E2E_API_URL/health/ready" "$$E2E_BASE_URL/" || { tail -n 80 "$(ARTIFACT_DIR)/e2e-services.log" >&2; exit 1; }; \
	 (cd frontend; for project in chromium firefox webkit; do env -u CI ./node_modules/.bin/playwright test --project="$$project" --workers=1 --forbid-only --retries=0 --reporter=line; done); \
	 if [[ "$(_RELEASE)" = 1 ]]; then \
	   test "$${AUDIT_LOAD_CONFIRM:-0}" = 1 || { echo 'Set AUDIT_LOAD_CONFIRM=1 for load testing the disposable release API' >&2; exit 2; }; \
	   command -v k6 >/dev/null; test -f k6/phase09.js; k6 run -e BASE_URL="$$E2E_API_URL" k6/phase09.js; \
	 fi
	$(call require,setsid curl npm)
	@$(process_helpers); [[ -f frontend/dist/index.html ]]; mkdir -p "$(ARTIFACT_DIR)"; $(call ports_free,$(PWA_PORT)); pid=; trap 'stop_group "$$pid"' EXIT; trap 'exit 130' INT; trap 'exit 143' TERM; \
	 (cd frontend && exec setsid npm run preview -- --host 127.0.0.1 --port "$(PWA_PORT)" --strictPort) >"$(ARTIFACT_DIR)/pwa-preview.log" 2>&1 & pid=$$!; \
	 url="http://127.0.0.1:$(PWA_PORT)"; wait_http "$$pid" 60 "$$url/" || { tail -n 80 "$(ARTIFACT_DIR)/pwa-preview.log" >&2; exit 1; }; \
	 cd frontend && PWA_BASE_URL="$$url" npm run pwa:browser

_container-build:
	$(COMPOSE) --profile '*' config --quiet
	@if [[ "$(_RELEASE)" = 1 ]]; then command -v cosign >/dev/null; cosign verify --certificate-identity "$$RELEASE_CERT_IDENTITY" --certificate-oidc-issuer "$$RELEASE_CERT_ISSUER" "$$RELEASE_IMAGE_REF"; cosign verify-attestation --type slsaprovenance1 --certificate-identity "$$RELEASE_CERT_IDENTITY" --certificate-oidc-issuer "$$RELEASE_CERT_ISSUER" "$$RELEASE_IMAGE_REF"; docker pull "$$RELEASE_IMAGE_REF"; fi
	$(call require,docker trivy)
	@mkdir -p "$(ARTIFACT_DIR)"; \
	 config=$$($(COMPOSE) --profile '*' config --format json); \
	 if [[ "$(_RELEASE)" = 1 ]]; then \
	   [[ $$RELEASE_IMAGE_REF =~ @sha256:[0-9a-f]{64}$$ ]]; docker image inspect "$$RELEASE_IMAGE_REF" >/dev/null; \
	   images=$$(printf '%s' "$$config" | "$(BACKEND_PYTHON)" -c 'import json,sys; c=json.load(sys.stdin); excluded={"api","worker","migrate"}; assert all(c["services"][n].get("build",{}).get("dockerfile")=="infra/backend.Dockerfile" for n in excluded), "Release image reuse requires the same backend Dockerfile"; print("\n".join(sorted({s.get("image") or c["name"]+"-"+n for n,s in c["services"].items() if n not in excluded and (s.get("build") or s.get("image"))})))'); \
	   builders=$$(printf '%s' "$$config" | "$(BACKEND_PYTHON)" -c 'import json,sys; c=json.load(sys.stdin); print("\n".join(n for n,s in c["services"].items() if s.get("build") and n not in {"api","worker","migrate"}))'); \
	   $(COMPOSE) --profile '*' pull --ignore-buildable; if [[ -n $$builders ]]; then mapfile -t services <<< "$$builders"; $(COMPOSE) --profile '*' build "$${services[@]}"; fi; \
	   images=$$'\n'"$$images"$$'\n'"$$RELEASE_IMAGE_REF"; \
	 else \
	   images=$$(printf '%s' "$$config" | "$(BACKEND_PYTHON)" -c 'import json,sys; c=json.load(sys.stdin); print("\n".join(sorted({s.get("image") or c["name"]+"-"+n for n,s in c["services"].items() if s.get("build") or s.get("image")})))'); \
	   $(COMPOSE) --profile '*' pull --ignore-buildable; $(COMPOSE) --profile '*' build; \
	 fi; [[ -n $$images ]] || { echo 'ERROR: No configured images' >&2; exit 2; }; status=0; \
	 while IFS= read -r image; do [[ -n $$image ]] || continue; id=$$(docker image inspect --format '{{.Id}}' "$$image") || { status=1; continue; }; name=$$(printf '%s' "$$image" | tr '/:@' '___'); \
	 trivy image --image-src docker --scanners vuln --severity "$(IMAGE_SEVERITY)" --exit-code 1 "$$id" || status=1; \
	 trivy image --image-src docker --scanners secret --exit-code 1 "$$id" || status=1; \
	 trivy image --image-src docker --format cyclonedx --output "$(ARTIFACT_DIR)/$$name.sbom.json" "$$id" || status=1; done <<< "$$images"; exit $$status

_production-endpoints:
	@test "$$PRODUCTION_E2E_CONFIRM" = 1 || { echo 'Set PRODUCTION_E2E_CONFIRM=1 only for a disposable production-mode deployment' >&2; exit 2; }
	@for url in "$$PRODUCTION_BASE_URL" "$$PRODUCTION_API_URL"; do \
	  [[ $$url =~ ^https://(localhost|127\.0\.0\.1|\[::1\]):([1-9][0-9]{0,4})$$ ]] && ((10#$${BASH_REMATCH[2]}<=65535)) || { echo 'Use explicit HTTPS loopback origins with ports and no credentials/path/query/fragment' >&2; exit 2; }; \
	done

_release-ready: _production-endpoints
	@[[ "$(POSTGRES_TEST_IMAGE)" =~ @sha256:[0-9a-f]{64}$$ && "$(REDIS_TEST_IMAGE)" =~ @sha256:[0-9a-f]{64}$$ ]] || { echo 'Release requires approved PostgreSQL and Redis digest references (set POSTGRES_TEST_IMAGE and REDIS_TEST_IMAGE)' >&2; exit 2; }
	@test -n "$$PREVIOUS_DB_REVISION" || { echo 'Set PREVIOUS_DB_REVISION to the last released revision; use base only for first release' >&2; exit 2; }
	@test -f "$$PREVIOUS_OPENAPI" || { echo 'Provide previous release OpenAPI artifact via PREVIOUS_OPENAPI' >&2; exit 2; }
	@[[ $$RELEASE_IMAGE_REF =~ @sha256:[0-9a-f]{64}$$ && -n $$RELEASE_CERT_IDENTITY ]] || { echo 'Release requires a CI-published image digest and approved signer identity' >&2; exit 2; }
	@test "$${AUDIT_LOAD_CONFIRM:-0}" = 1 || { echo 'Set AUDIT_LOAD_CONFIRM=1 for disposable load testing' >&2; exit 2; }


_production-check: _production-endpoints _test-ready _container-build
	@$(process_helpers); http_ok 10 "$$PRODUCTION_API_URL/health/live" && http_ok 10 "$$PRODUCTION_BASE_URL/" || { echo 'ERROR: Production test endpoints are not ready' >&2; exit 1; }
	@$(isolated_services); $(call alembic_run,upgrade head); $(call alembic_run,check); \
	 [[ $$RELEASE_IMAGE_REF =~ @sha256:[0-9a-f]{64}$$ ]]; image=$$(docker image inspect --format '{{.Id}}' "$$RELEASE_IMAGE_REF"); \
	 image_user=$$(docker image inspect --format '{{.Config.User}}' "$$image"); image_user=$${image_user%%:*}; [[ -n $$image_user && $$image_user != root && ! $$image_user =~ ^0+$$ ]] || { echo 'API image must run as non-root' >&2; exit 1; }; \
	 net=$$(docker network create --internal "blueprint-release-$${RANDOM}-$${BASHPID}"); docker network connect --alias postgres "$$net" "$$pg"; docker network connect --alias redis "$$net" "$$redis"; \
	 export APP_ENV=production DATABASE_URL=postgresql+asyncpg://blueprint_test:ephemeral_test_only@postgres:5432/blueprint_test REDIS_URL=redis://redis:6379/0 CELERY_BROKER_URL=redis://redis:6379/0 CELERY_RESULT_BACKEND=redis://redis:6379/0; \
	 export JWT_SECRET=$$("$(BACKEND_PYTHON)" -c 'import secrets; print(secrets.token_urlsafe(48))') COOKIE_SECURE=true RATE_LIMIT_FAIL_OPEN=false LOG_FORMAT=json FRONTEND_URL=https://localhost CORS_ALLOWED_ORIGINS=https://localhost ALLOWED_HOSTS=localhost,127.0.0.1 E2E_RELAX_RATE_LIMITS=false; \
	 api_container=$$(docker run -d --pull=never --network "$$net" -e APP_ENV -e DATABASE_URL -e REDIS_URL -e CELERY_BROKER_URL -e CELERY_RESULT_BACKEND -e JWT_SECRET -e JWT_ALGORITHM -e ACCESS_TOKEN_EXPIRE_MINUTES -e REFRESH_TOKEN_EXPIRE_DAYS -e COOKIE_SECURE -e RATE_LIMIT_FAIL_OPEN -e LOG_FORMAT -e FRONTEND_URL -e CORS_ALLOWED_ORIGINS -e ALLOWED_HOSTS -e E2E_RELAX_RATE_LIMITS -e HEALTH_READY_PUBLIC=true -e WORKER_HEALTH_REQUIRED=false -e CELERY_TASK_ALWAYS_EAGER=true -e AI_ENABLED=false -e RAG_ENABLED=false -e MEMORY_ENABLED=false "$$image"); \
	 end=$$((SECONDS+90)); ready=0; while ((SECONDS<end)); do if timeout 5 docker exec "$$api_container" python -c 'import urllib.request; [urllib.request.urlopen("http://127.0.0.1:8000/health/"+p,timeout=2).close() for p in ("live","ready")]' >/dev/null 2>&1; then ready=1; break; fi; sleep 1; done; \
	 mkdir -p "$(ARTIFACT_DIR)"; docker logs "$$api_container" >"$(ARTIFACT_DIR)/production-image.log" 2>&1; ((ready)) || { echo 'Production image readiness failed; inspect production-image.log' >&2; exit 1; }; \
	 docker exec -e PYTHONOPTIMIZE=0 "$$api_container" python -c 'import os; from backend.core.config import settings; assert os.getuid()!=0 and settings.is_production and settings.COOKIE_SECURE and not settings.RATE_LIMIT_FAIL_OPEN'; echo 'Production API image smoke passed'
	@cd frontend; export E2E_BASE_URL="$$PRODUCTION_BASE_URL" E2E_API_URL="$$PRODUCTION_API_URL" E2E_RELAX_RATE_LIMITS=false; \
	 for project in chromium firefox webkit; do args=(); if [[ $$project = chromium ]]; then args+=(--grep-invert "@(visual-regression|security-headers|accessibility|design-tokens)"); fi; env -u CI ./node_modules/.bin/playwright test --project="$$project" --workers=1 --forbid-only --retries=0 --reporter=line "$${args[@]}"; done
	@mkdir -p "$(ARTIFACT_DIR)"; cd frontend; export E2E_BASE_URL="$$PRODUCTION_BASE_URL" E2E_API_URL="$$PRODUCTION_API_URL" E2E_RELAX_RATE_LIMITS=false; \
	 for tag in visual-regression security-headers accessibility design-tokens; do \
	   PLAYWRIGHT_JUNIT_OUTPUT_FILE="$(ARTIFACT_DIR)/$$tag-junit.xml" env -u CI ./node_modules/.bin/playwright test --project=chromium --workers=1 --forbid-only --retries=0 --grep "@$$tag" --reporter=junit; \
	   "$(BACKEND_PYTHON)" -c 'import sys,xml.etree.ElementTree as E; cases=E.parse(sys.argv[1]).findall(".//testcase"); assert cases and all(c.find("skipped") is None and c.find("failure") is None and c.find("error") is None for c in cases), "Missing or skipped required browser regression"' "$(ARTIFACT_DIR)/$$tag-junit.xml"; \
	 done
	$(call require,zap-baseline.py)
	@mkdir -p "$(ARTIFACT_DIR)"; cd "$(ARTIFACT_DIR)" && zap-baseline.py -t "$$PRODUCTION_BASE_URL" -r zap-report.html -J zap-report.json
	$(call require,lighthouse)
	@mkdir -p "$(ARTIFACT_DIR)"; lighthouse "$$PRODUCTION_BASE_URL" --output=json --output-path="$(ARTIFACT_DIR)/lighthouse.json" --chrome-flags='--headless'; \
	 "$(BACKEND_PYTHON)" -c 'import json,sys; c=json.load(open(sys.argv[1]))["categories"]; assert c["performance"]["score"]>=0.8 and c["accessibility"]["score"]>=0.9, "Lighthouse budget failed"' "$(ARTIFACT_DIR)/lighthouse.json"

# Compatibility targets retain the public Makefile commands from earlier releases.
backend-sync: ## Install locked backend dependencies.
	cd backend && uv sync --locked --all-extras

backend-lock: ## Refresh the backend lockfile and dependency export.
	cd backend && uv lock
	cd backend && uv export --quiet --locked --no-dev --no-emit-project -o requirements.txt

backend-lock-check: ## Verify the backend lockfile.
	cd backend && uv lock --check

lint: ## Lint backend and frontend source.
	"$(VENV_BIN)/ruff" check backend
	cd frontend && npm run lint

format: ## Format backend source.
	"$(VENV_BIN)/ruff" format backend

check-types: ## Type-check frontend source.
	cd frontend && npm run typecheck

typecheck: ## Type-check backend source.
	cd backend && "$(VENV_BIN)/pyright" -p pyproject.toml

architecture-check: ## Validate backend import and architecture boundaries.
	"$(VENV_BIN)/lint-imports" --config .importlinter --no-cache
	"$(BACKEND_PYTHON)" backend/scripts/check_architecture.py

api-contract-check: ## Verify and validate the runtime OpenAPI contract.
	cd frontend && npm run api:check
	cd backend && "$(BACKEND_PYTHON)" scripts/export_openapi.py --profile runtime --output /tmp/fullstack-blueprint-runtime-openapi.json
	cd backend && "$(BACKEND_PYTHON)" scripts/validate_openapi.py --input /tmp/fullstack-blueprint-runtime-openapi.json

blueprint-check: ## Validate blueprint configuration and generator tests.
	"$(BACKEND_PYTHON)" -m backend.blueprint.cli validate --config blueprint.yml
	"$(BACKEND_PYTHON)" -m pytest backend/blueprint/tests -q

phase11-check: ## Generate isolated reference applications.
	@reference_output=$$(mktemp -d /tmp/fullstack-blueprint-phase11.XXXXXX); \
	 "$(BACKEND_PYTHON)" -m backend.blueprint.cli reference-apps --output "$$reference_output"; \
	 echo "Reference applications generated at $$reference_output"

coverage: test-backend ## Run backend tests with coverage.

security-audit: _security-check ## Run security scanners and frontend dependency audit.
	cd frontend && npm run audit

test-load: ## Run the existing k6 load scenario.
	$(call require,k6)
	k6 run k6/phase09.js

backup: ## Back up the configured PostgreSQL database.
	+$(MAKE) db ACTION=backup

restore: ## Restore into an explicitly confirmed disposable database.
	+$(MAKE) db ACTION=restore

test-backend: _backend-test ## Run backend tests.

test-frontend: _frontend-test ## Run frontend tests.

dead-code-frontend: ## Find unused frontend code.
	cd frontend && npm run knip

dead-code-backend: ## Find unused backend code.
	cd backend && "$(VENV_BIN)/vulture"

dead-code-production: ## Find unused production frontend code.
	cd frontend && npm run knip:production

dead-code-backend-strict: ## Find high-confidence unused backend code.
	cd backend && "$(VENV_BIN)/vulture" --min-confidence 100

dead-code: ## Find unused frontend and backend code.
	@status=0; $(MAKE_CMD) dead-code-frontend || status=1; $(MAKE_CMD) dead-code-backend || status=1; exit $$status


.PHONY: _migration-check help doctor setup install update dev infra db \
  fix test check build clean release _host-versions _versions \
  _dev-config _local-ready _ports _db-check _db-migrate _db-backup _db-restore _backend-check \
  _frontend-check _infra-check _security-check _test-ready _backend-test _frontend-build _frontend-test _container-build \
  _release-ready _production-endpoints _production-check \
  backend-sync backend-lock backend-lock-check lint format check-types typecheck \
  architecture-check api-contract-check blueprint-check phase11-check coverage \
  security-audit test-load backup restore test-backend test-frontend \
  dead-code-frontend dead-code-backend dead-code-production dead-code-backend-strict dead-code
