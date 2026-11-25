# ADR 0003: Blueprint generation and AI development tooling

Status: Accepted

Date: 2026-11-24

## Decision

Keep blueprint generation in `backend.blueprint` with a versioned YAML contract,
profile resolver, deterministic manifest, and safe update workflow. The repository is
both the working reference application and the source for generated projects, so a
repository-owned generator is currently clearer than introducing a second template
tree.

Generated projects use reference mode by default. Historical Alembic migrations are
never rewritten or deleted, and updates touch only generator-owned artifacts. The
manifest separately records selected capabilities, installed-but-disabled
capabilities, and excluded modules.

## Tool evaluation

- Copier: useful if the source is later split into a clean template and product
  repository; not adopted now because that would duplicate the working reference tree.
- Spec Kit and OpenSpec: not adopted as runtime or generation dependencies. The YAML
  contract, phase records, and ADRs provide the required durable specification here.
- Context7 and Serena: optional agent context and code-navigation integrations.
- Repomix: optional context packaging for bounded review tasks.
- GitHub MCP and Playwright MCP: optional development integrations for repository and
  browser workflows; production services remain independent of both.

These tools may be configured by an individual developer or CI job, but no generated
project imports them and no application path requires their availability.

## Consequences

The generator is easy to run in offline/reference environments and can validate
profile dependencies without external services. A future template split can adopt
Copier or another transport while retaining the YAML contract and manifest semantics.
