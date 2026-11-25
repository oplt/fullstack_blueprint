# Module boundaries

Status: `VERIFIED` for the current baseline; target rules are marked explicitly.

## Ownership contract

Every backend module owns its API schemas, application use cases, repositories, and persistence models unless a shared cross-module model is documented. A route may compose a service and map its result to a response, but it must not bypass authorization or reach into another module's repository for business behavior.

## Boundary map

| Owner | Owns | May depend on | Must not own or bypass |
| --- | --- | --- | --- |
| `api` | Router registration, global middleware, request dependencies | All module routers, core config | Business decisions or direct module SQL |
| `identity_access` | Authentication identity and sessions | Redis, email job port, user model | Project authorization or provider-specific business data |
| `organizations` | Organization ownership, membership, and tenant administration | Identity user records, SQLAlchemy | Resource-specific project/RAG authorization decisions |
| `projects` | Project, membership, task lifecycle and project ACL | Users, notification port, SQLAlchemy | RAG/memory internals |
| `platform` | Feature packs, flags, billing, entitlements, API keys, webhooks, templates | Settings, audit, outbound HTTP port | User passwords or project membership |
| `ai` | Prompt/runs/agents/evaluations/reviews and AI provider selection | Generation port, RAG read port, memory port, job port | RAG ingestion persistence or Mem0 SDK |
| `rag` | Documents, ingestion, revisions, chunking, retrieval, citations | Project access port, embedding/vector/storage ports, job port | AI prompt/run tables and provider SDKs |
| `memory` | Memory policy, Mem0 adapter boundary, registry/audit | Project access port, memory port, job port | Direct use by unrelated modules of Mem0 SDK |
| `notifications` | User notifications/preferences | Identity user id, repository | Project authorization policy |
| `calendar` | Calendar entries and project linkage | Projects service/port | RAG/AI persistence |
| `audit` | Append-only audit records and audit port | SQLAlchemy | Authorization decisions |
| `observability` | Metrics/traces/error reporting and links | Read-only configuration and telemetry SDKs | Database session initialization |
| `workers` | Job transport and process runtime | Application command ports, worker-local sessions | HTTP request state or shared API session |
| `capabilities` | Capability metadata and availability | Deployment settings, module-pack metadata | Authorization decisions or entitlement grants |
| `events` | Versioned domain envelopes and outbox delivery | Application services, Celery transport | Inline external side effects or broker dual writes |

## Allowed dependency matrix

`Y` means a direct dependency is allowed; `P` means only through a typed port; `N` means it is not allowed.

| From \\ To | Core | Identity | Projects | Platform | AI | RAG | Memory | Audit | Infra |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| API/composition | Y | Y | Y | Y | Y | Y | Y | P | Y |
| Identity | Y | Y | N | P | N | N | N | P | P |
| Projects | Y | P | Y | N | N | N | N | P | P |
| Platform | Y | P | N | Y | N | N | N | P | P |
| AI | Y | P | P | P | Y | P | P | P | P |
| RAG | Y | P | P | N | P | Y | P | P | P |
| Memory | Y | P | P | N | P | N | Y | P | P |
| Workers | Y | N | N | N | P | P | P | N | Y |

## Current boundary exceptions to retire

- `backend/modules/platform/service.py` uses multiple inheritance as a capability facade. Replace with an explicit composition facade or narrow read/write ports.
- `backend/modules/ai/service.py`, `run_service.py`, and `evaluation_service.py` compose services through inheritance. Preserve behavior while migrating to injected collaborators.
- `backend/modules/admin/router.py` and platform/settings/notification/user routers previously queried or committed with `AsyncSession`; the route-boundary scanner now prevents regression.
- `backend/modules/ai/document_service.py` owns a compatibility path into RAG. Keep this route additive, but make the RAG document application port the only implementation path.
- Worker modules import task functions dynamically from the task registry, creating a static cycle. Introduce job command interfaces or a registry at the composition root.

## Boundary review checklist

- [ ] New route calls an application service.
- [ ] Service receives the authenticated subject and resource scope explicitly.
- [ ] Repository query includes the ownership/ACL predicate at the retrieval boundary.
- [ ] External SDK calls happen behind a port/adapter.
- [ ] One session is used sequentially per request or worker command.
- [ ] Commit/rollback ownership is documented and tested.
- [ ] Optional behavior is disabled when its server configuration is disabled.
- [ ] A contract or regression test protects retained behavior.

## Enforced checks

- `.importlinter` protects domain/application direction.
- `backend/scripts/check_architecture.py` rejects repository imports, SQL expressions,
  and direct session persistence operations from route adapters.
- `backend/modules/capabilities/registry.py` is the metadata source for capability
  dependencies and deployment availability; it is not an authorization layer.
- `backend/modules/events` owns the durable event envelope, outbox repository, receipt
  deduplication, retry, and dead-letter lifecycle.

