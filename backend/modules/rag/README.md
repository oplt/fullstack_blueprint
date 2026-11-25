# Document retrieval

RAG owns the document lifecycle. The API accepts uploads, stores originals in private S3-compatible storage, queues parsing and chunking, creates embeddings and immutable index revisions, and supports hybrid retrieval and citation validation. AI document compatibility routes call the same pipeline.

Enable the service with `RAG_ENABLED=true` and install `uv sync --locked --extra rag`. Configure the S3 bucket and provider. PostgreSQL holds both typed vectors and full-text search data. The Alembic baseline creates pgvector and the expected 1536-dimensional column, cosine HNSW index, and full-text GIN index. Enable `RAG_REQUIRE_ANN_INDEX=true` to check index health at startup during development. Production checks it when RAG is enabled.

The authenticated user owns ingested documents. Request filters may restrict access by project, document, or index revision. Maintain explicit allow-lists for scoped retrieval and validate citations against the supplied evidence. Avoid putting raw document content in logs.

Phase 07 adds optional Docling and clamd adapter ports, archive resource
validation, ingestion progress/heartbeat/retry metadata, and versioned embedding
contracts. Additional embedding dimensions are stored in additive
`rag_chunk_embeddings` index generations; the default 1536-dimensional pgvector
index remains unchanged. Index generations can be activated or rolled back
without deleting previous vectors. Qdrant, BGE-M3, GraphRAG, and visual
retrieval remain evaluation-only until benchmark evidence justifies them.

Run `backend/.venv/bin/python -m pytest backend/modules/rag/tests` from the repository root. Benchmark fixtures under `eval/fixtures` are synthetic document collections. Install `--extra rag-eval` for the multilingual benchmark.
