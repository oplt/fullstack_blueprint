# Phase 07 — Advanced RAG and memory infrastructure

Status: `VERIFIED`

## Delivered

- Preserved the existing hybrid retrieval, full-text, pgvector, query expansion,
  reranking, fusion, source diversification, parent context, citation, ACL, and
  immutable revision paths.
- Added configurable parser/safety ports, an optional lazy Docling adapter,
  archive path-traversal/resource checks, optional clamd scanning, document
  parser metadata, and ingestion progress/heartbeat/retry/idempotency fields.
- Added versioned embedding model contracts covering provider, model/version,
  dimensions, distance metric, normalization, chunking, index version, and cost.
  Alternate dimensions use additive `rag_chunk_embeddings` rows with variable
  pgvector dimensions; the existing 1536-dimensional compatibility index is
  unchanged. Index generations support build, active switch, retirement, and
  rollback without destructive changes.
- Added deterministic retrieval evaluation metrics for Recall@K, Precision@K,
  MRR, nDCG, citation accuracy, faithfulness, latency, cost, and tenant
  isolation. Existing defaults remain unchanged; BGE-M3, Qdrant, GraphRAG, and
  visual retrieval remain evaluation-only/optional decisions.
- Added editable memory governance: provenance, confidence, explicit scope,
  consent, retention/TTL, content hashes, sensitive-information filtering,
  correction, export, deletion propagation, conflict metadata, and tenant
  isolation. Audit rows remain immutable and separate from editable memory.

## Persistence

Migration `0005_advanced_rag_memory` adds embedding model/index generations,
variable-dimension chunk vectors, ingestion progress/safety metadata, and
governed memory registry fields. It uses additive DDL and retains prior index
generations for rollback.

## Configuration

`RAG_EMBEDDING_REGISTRY_JSON` can define additional embedding contracts;
`RAG_DOCLING_ENABLED` and `RAG_PDF_PARSER=docling` opt into Docling;
`RAG_MALWARE_SCAN_ENABLED`, `RAG_MALWARE_SCANNER=clamd`, and
`RAG_MALWARE_SCAN_REQUIRED` control scanning. Memory governance is controlled
by `MEMORY_DEFAULT_RETENTION_DAYS`, `MEMORY_CONSENT_REQUIRED`, and
`MEMORY_SENSITIVE_FILTER_ENABLED`.

The default remains PostgreSQL/pgvector and existing parser/embedding defaults.
No Qdrant, BGE-M3, GraphRAG, or visual-retrieval dependency is installed without
benchmark evidence.

## Verification

- Phase 07 RAG/memory tests and the existing RAG suite pass.
- Offline Alembic SQL upgrade succeeds through `0005_advanced_rag_memory`.
- Full repository gates remain required before release.

## Limitations

The workspace cannot start Docker services, so live PostgreSQL/pgvector
migration and external Mem0/clamd/Docling integration tests remain deployment
checks. Optional adapters fail closed or degrade explicitly when unavailable.

