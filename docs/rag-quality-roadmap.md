# RAG quality and RAGFlow comparison

## Scope and evidence

This is an architectural comparison, not evidence that either system is more accurate. The
reference is [RAGFlow at the pinned revision](https://github.com/infiniflow/ragflow/tree/bb7b3c28888c21e1610678d3d7b8c2094265a644).
Its parser, chunker and retrieval-testing references are linked in `prompt.txt` §7. The pinned
source fetch and live RAGFlow run were unavailable in this environment, so no RAGFlow quality,
latency, or cost numbers are reported.

### Offline fixture result (2026-11-26)

Command: `backend/.venv/bin/python -m backend.modules.rag.eval.retrieval_eval`.
The harness evaluated 13 hand-authored cases, each with supplied dense and lexical ranked lists.
It did not call the live retrieval service. These synthetic lists are deterministic regression
inputs, not human-reviewed relevance labels or a quality estimate for user documents.

| Supplied ranking | Precision@5 | Recall@5/10/20 | MRR@10 | nDCG@10 |
| --- | ---: | ---: | ---: | ---: |
| Dense-only baseline | 0.262 | 0.923 | 0.923 | 0.903 |
| Lexical-only | 0.262 | 0.923 | 0.731 | 0.781 |
| RRF hybrid | 0.262 | 0.923 | 0.923 | 0.923 |

Precision@k divides by k even when a supplied list contains fewer than k items. Only four cases
carry citation outputs: structural validity 0.50, citation precision 0.50, citation recall 0.375,
and unsupported claim rate 0.50. Those citation fixtures cover one exact supported claim, one
correct no-evidence response, one fabricated ID and one omitted claim. The no-answer set contains
only one case and does not measure production abstention thresholds.

There are no human-reviewed labels, held-out split, confidence intervals, live retrieval or
generation, exact-vs-ANN comparison, model/token cost, or latency measurements in this result.
It must not be used to select production settings or claim a comparison with RAGFlow.

The focused duplicate-ID reproduction uses `k=1`: the repeated chunk previously accumulated
`1/2 + 1/3 = 0.833333` from one branch; it now contributes `1/2 = 0.5` once. The 13-case
aggregate is unchanged because its ranked lists contain no intra-branch duplicate IDs.

## Implemented in this pass

- RRF now counts each chunk at most once per ranked branch. Repeated IDs no longer gain score by
  appearing more than once in one branch.
- Dutch contradiction queries receive Dutch support/counter-evidence variants; lexical search
  retains the original query.
- If reranking is enabled without an available implementation, the planner reports `noop` and
  skips the rerank window. Deployments can now explicitly select Unicode heuristic or optional
  Cohere reranking. The retrieved order remains available on timeout or invalid provider results.
- Retrieval applies typed metadata filters inside both search branches, preserves the dense score
  floor and keeps distinct table row groups during evidence deduplication. The lexical branch
  uses stored language metadata, quoted phrases and exact identifiers.
- Docling failures fall back to the baseline parser and mark the configured parser, fallback,
  and exception type. Markdown-only Docling output no longer claims that layout provenance or
  structured tables were preserved.
- The deterministic regression suite covers these cases plus structured parser provenance,
  revision binding, table geometry, Markdown hierarchy and chunk-level layout references.
  The existing backend pytest CI job discovers these tests.

## Next quality work

1. **Build representative labels.** Version a licensed/public or explicitly synthetic corpus
   with source document/page/span qrels. Start with at least 100 human-reviewed questions across
   tables, scans, multilingual, exact identifiers, contradiction and no-answer. Separate tune and
   held-out sets; report sample sizes and uncertainty.
2. **Complete structured parser rollout.** Baseline and Docling parsers now produce a common
   page/block model with revision-bound IDs, reading order, spans, geometry, heading paths and
   structured table cells. Docling is loaded lazily and traverses picture items; the optional
   package is not yet pinned in `pyproject.toml`/`uv.lock` because dependency resolution could not
   reach PyPI in this environment. Provision and lock a verified Docling version before enabling
   it in a deployable runtime. Add authorized fixtures for multi-column pages, scans, mixed OCR,
   tables and figure captions; verify real media references and parser memory/time budgets. Keep
   OCR and vision opt-in and local unless transfer is authorized.
3. **Evaluate chunking revisions.** New indexing runs record `structure-v2`, the resolved format
   policy, token counter and window settings. Use the local preview to check headings, source
   offsets and table row groups before reindexing. Large tables use repeated headers in retrieval
   children and retain the full parser output in a parent when parent context is enabled. An
   individual row plus its header that exceeds the chunk limit reports an ingestion error. See
   the [chunking fixture report](../backend/modules/rag/eval/chunking_baseline_report.md) for the
   measured sweep, preview commands and revision rollout. Persisted user-selected profiles,
   separately budgeted neighboring media context and a held-out quality comparison remain open.
4. **Measure retrieval changes.** The current fixture run is recorded above. A disposable
   PostgreSQL 18 standalone check previously validated a scoped lexical identifier query and the
   pgvector iterative scan setting; that was not a retrieval quality benchmark. Compare dense,
   lexical, RRF, deduplicated/diversified and reranked retrieval on the same held-out qrels and
   authorized scope. Report Recall@5/10/20, Precision@k, MRR@10, nDCG@10, language/document slices,
   latency percentiles and cost. Keep reranking as `noop` unless a measured implementation is
   configured.
5. **Calibrate semantic grounding.** The grounded answer path now validates complete verbatim
   sentences and structured table excerpts against the displayed, authorized evidence. It retries
   once and abstains on further failure. It also rechecks source access and active revisions after
   generation. On eight curated pairs, the extractive validator accepted both verbatim positives
   and rejected all five negatives. It also rejected one supported paraphrase. The fixture has
   precision 1.00 and recall 0.67. Broader judgments, calibrated semantic entailment and a live
   provider evaluation remain open. The authenticated text preview highlights exact excerpts and
   can sign a matching original PDF. Graphical bounding box overlays and figure crops remain open.
6. **Run live comparisons only in disposable, authorized environments.** Use the existing
   `backend.modules.rag.eval.run_end_to_end` and pgvector load harnesses for Blueprint. Run the
   pinned RAGFlow revision against the same corpus, model settings, access scope and budget. Keep
   parse-only, retrieval-only and answer-generation results separate. For this evaluation the
   container API denied access, `RAG_INTEGRATION_DATABASE_URL` and `RAGFLOW` environment settings
   were absent, and the pinned GitHub source fetch returned a cache miss. The live comparison is
   blocked pending an authorized disposable database and pinned RAGFlow deployment.

Do not use the current fixture scores to choose a chunk profile, claim a RAGFlow comparison, or
set production quality thresholds. Keep the active index unchanged until a new profile passes
held-out retrieval and citation checks; retain the existing revision for rollback.
