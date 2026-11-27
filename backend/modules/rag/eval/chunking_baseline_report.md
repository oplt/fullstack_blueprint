# Chunking evaluation and rollout

`structure-v2` preserves source offsets for text chunks and records row ranges and source
block IDs for structured tables. Prose still targets 1000 tokens with 150 overlap, PDFs cap
the target at 768 and the overlap at 96, and table row groups use zero overlap. Chunk metadata
records which counter was used. Known OpenAI embedding models use a locally provisioned
`cl100k_base` tokenizer when available and a conservative UTF-8 byte bound otherwise.

## Measured fixture sweep

On the three bundled text fixtures, all 16 combinations of 256, 512, 768 and 1000 tokens
with 0%, 10%, 15% and 20% overlap emitted three chunks, 64 estimated tokens and 0% duplicate
tokens. Each fixture fits in one chunk, so the sweep cannot distinguish the settings. The
synthetic ranking examples are independent of the window settings.

```bash
backend/.venv/bin/python -m backend.modules.rag.eval.chunking_experiments
backend/.venv/bin/python -m backend.modules.rag.eval.chunking_experiments \
  --preview-file backend/modules/rag/eval/fixtures/corpus/multilingual.txt \
  --chunk-size 256 --chunk-overlap 38 --parent-window 3 --limit 2
```

Preview runs the same parser and chunker as ingestion against a local file. It prints source
spans and parent links without embedding or publishing. Parent window zero disables parent
creation in preview.

## Revision rollout and rollback

1. Run the size and overlap matrix with several parent windows on an authorized corpus in a
   disposable database. Keep source-coordinate labels, embedding model, retrieval settings and
   access scope fixed. Compare recall, ranking, citation accuracy, duplicate tokens, latency and
   cost before changing defaults. The current fixtures and local hash embeddings are insufficient
   for that decision.
2. Record each affected document's active revision ID before reindexing. Use the existing index
   queue for approved documents. Ingestion writes chunks to a new revision and switches the active
   pointer in the same transaction as job completion. Existing revisions remain available for
   rollback.
3. If a revision regresses, stop pending reindex work for the document. Restore the previous
   revision through the repository's revision activation operation in an authorized maintenance
   transaction, with the document locked and its ownership, revision membership and embedding
   compatibility verified. Invalidate retrieval caches and check that reads use the restored
   revision. There is no public rollback endpoint.

A disposable PostgreSQL cluster initialized successfully, but the sandbox denied the server's
Unix socket bind. The live comparison and rollback were not exercised here.
