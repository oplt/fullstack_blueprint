# Document retrieval

RAG owns the document lifecycle. The API accepts uploads, stores originals in private S3-compatible storage, queues parsing and chunking, creates embeddings and immutable index revisions, and supports hybrid retrieval and citation validation. AI document compatibility routes call the same pipeline.

Enable the service with `RAG_ENABLED=true` and install `uv sync --locked --extra rag`. Configure the S3 bucket and provider. PostgreSQL holds both typed vectors and full-text search data. The Alembic baseline creates pgvector and the expected 1536-dimensional column, cosine HNSW index, and full-text GIN index. Enable `RAG_REQUIRE_ANN_INDEX=true` to check index health at startup during development. Production checks it when RAG is enabled.

## Retrieval and ranking

`POST /rag/retrieve` supports hybrid, dense and lexical modes. Its optional `metadata_filter`
accepts format and language lists and an inclusive page range. These conditions apply within
the authorized document scope. Language filters use stored language metadata. The dense
branch applies `RAG_SCORE_THRESHOLD` as a minimum cosine similarity. Lexical search and RRF
scores use their own scales.

Reranking defaults to `none`. Set `RAG_RERANK_MODE=heuristic` for Unicode token overlap, or
`RAG_RERANK_MODE=provider` with `RAG_RERANK_MODEL` and `RAG_COHERE_API_KEY` for Cohere.
Provider mode sends the query and authorized candidate text to Cohere. Enable it only in
deployments authorized for that transfer. The request has a bounded candidate window and
deadline. Retrieval keeps the original order on provider failure and reports the applied
ranker and status. Older deployments can still use both legacy rerank flags with the mode
unset. The `cross_encoder` mode requires an implementation that this runtime does not ship.

On pgvector 0.8 or later, `RAG_PGVECTOR_ITERATIVE_SCAN=true` enables strict iterative HNSW
scanning within the dense query transaction. Use the exact versus ANN benchmark to evaluate
recall and latency on representative scopes before selecting settings.

## Grounded answers and citations

The grounded answer endpoint returns only complete excerpts supported by the citable text it
sent to the model. It may abstain where a paraphrase or synthesis would be useful. The configured
answer model must be in the model registry so the service can reserve output tokens and bound the
prompt. Known OpenAI tokenizers use locally cached assets when available. Other configurations
use a conservative byte count.

Source previews recheck authorization and the current index revision. They show the indexed
excerpt, page, section and table range when available. A matching original PDF can be opened
through a short-lived signed URL. Previews do not cache private source text.

Docling remains optional. Set `RAG_DOCLING_ENABLED=true` and `RAG_PDF_PARSER=docling` only in a runtime where the `docling` package has been provisioned. Startup fails clearly if the package is absent. Docling output is page/block structured; conversion errors still use the baseline parser and mark fallback provenance. OCR runs locally when the parser's default pipeline enables it; this adapter does not send documents to hosted vision services. A reproducible locked Docling extra is pending dependency resolution.

The authenticated user owns ingested documents. Request filters may restrict access by project, document, or index revision. Maintain explicit allow-lists for scoped retrieval and validate citations against the supplied evidence. Avoid putting raw document content in logs.

Phase 07 adds optional Docling and clamd adapter ports, archive resource
validation, ingestion progress/heartbeat/retry metadata, and versioned embedding
contracts. Additional embedding dimensions are stored in additive
`rag_chunk_embeddings` index generations; the default 1536-dimensional pgvector
index remains unchanged. Index generations can be activated or rolled back
without deleting previous vectors. Qdrant, BGE-M3, GraphRAG, and visual
retrieval remain evaluation-only until benchmark evidence justifies them.

Run `backend/.venv/bin/python -m pytest backend/modules/rag/tests` from the repository root. Benchmark fixtures under `eval/fixtures` are synthetic document collections. Install `--extra rag-eval` for the multilingual benchmark.
