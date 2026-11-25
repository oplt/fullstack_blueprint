# ADR 0001: Retain the modular monolith

Status: Accepted  
Date: 2026-11-24

## Context

The repository already contains multiple domain capabilities, background workers, optional provider integrations, and a generated frontend contract. The Phase 00 audit found boundary inconsistencies and import cycles, but no evidence that independent deployment or scaling requires microservices.

## Decision

Retain the modular monolith. Improve dependency direction, typed ports, transaction ownership, security, and operational validation inside the existing process/repository topology. Extract a service only after measured load, isolation, deployment, or regulatory requirements make the boundary beneficial.

## Consequences

- Existing API and database contracts remain the compatibility anchor.
- Refactoring can be incremental and tested with the current suite.
- Shared runtime failures remain possible, so cycle checks and module boundaries are mandatory.
- Worker processes remain separate execution contexts without requiring a microservice split.

## Revisit trigger

Revisit only with evidence such as sustained resource contention, independent release requirements, a security boundary that cannot be enforced in-process, or a data ownership boundary that requires separate deployment.

