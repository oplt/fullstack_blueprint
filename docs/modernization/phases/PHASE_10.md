# Phase 10 — Blueprint generation and AI-assisted development infrastructure

Status: `VERIFIED`

Scope: reproducible project generation, profile/module selection, safe updates,
configuration/deployment/test manifests, and repository-local AI development skills.

## Delivered

- Added `backend.blueprint` validation/generation CLI and a YAML contract adapted to
  the repository’s actual capability registry and optional dependency groups.
- Added eight profiles: minimal API, lean SaaS, AI SaaS, knowledge base, automation,
  enterprise SaaS, marketplace, and internal tool.
- Added dependency resolution, environment generation, infrastructure/test/security
  manifests, migration-head compatibility metadata, deterministic config hashes, and
  safe metadata-only update workflows that preserve user files and historical migrations.
- Added root AI-agent guidance plus 15 scoped repository-local skills covering backend,
  APIs, schema, tenancy, authorization, entitlements, AI, tools, MCP, workers,
  integrations, webhooks, tests, security, and release preparation.
- Evaluated Copier conceptually; retained a repository-owned generator because this
  checkout is a working reference application rather than a separated Copier template.
  Copier remains an optional future template transport, not a runtime dependency.
- Evaluated Spec Kit and OpenSpec as specification workflow options; the repository
  keeps the versioned YAML contract and Markdown decision records as the source of
  truth because no hosted specification service is required.
- Evaluated Context7, Serena, Repomix, GitHub MCP, and Playwright MCP as optional
  developer integrations. They may improve agent context, repository search, or
  browser verification, but are not runtime or generation dependencies.

## Usage

```bash
PYTHONPATH=. backend/.venv/bin/python -m backend.blueprint.cli profiles
PYTHONPATH=. backend/.venv/bin/python -m backend.blueprint.cli validate --config blueprint.yml
PYTHONPATH=. backend/.venv/bin/python -m backend.blueprint.cli generate \
  --config blueprint.yml --output /tmp/example-product
PYTHONPATH=. backend/.venv/bin/python -m backend.blueprint.cli update \
  --config blueprint.yml --project /tmp/example-product
```

Generated projects retain historical migrations and source capabilities in reference
mode; unselected optional capabilities are disabled by generated settings and do not
add optional infrastructure. Physical source pruning is deliberately not inferred.

## Validation and limitations

- Generator unit tests, sample-contract validation, full backend/frontend tests,
  static checks, OpenAPI validation, and frontend build pass.
- A generated-project live install/start against PostgreSQL/Redis was not run in this
  environment because Docker is unavailable; CI/deployment should execute that matrix.

