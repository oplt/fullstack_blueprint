# ADR 0002: Use an evidence-backed baseline before architecture changes

Status: Accepted  
Date: 2026-11-24

## Context

`prompt.txt` describes a broad target architecture, while the repository already contains mature backend, frontend, RAG, memory, and observability work. Replacing components before inspecting them would risk breaking retained behavior and data.

## Decision

Phase 00 records source evidence, executable validation results, security findings, dependency status, current/target diagrams, migration strategy, and prioritized backlog before runtime changes. Only executed checks may be marked successful.

## Consequences

- Findings are explicit and can be scheduled by priority.
- Environment blockers are distinguished from product failures.
- Future phases can make small, reversible changes with contract evidence.

