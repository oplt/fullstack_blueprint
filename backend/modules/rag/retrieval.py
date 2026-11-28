from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass, replace
from time import perf_counter

from opentelemetry import trace
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from backend.core.config import settings
from backend.core.vectors import can_index_embedding
from backend.modules.rag import metrics
from backend.modules.rag.config import RagConfig
from backend.modules.rag.context_selection import select_context_chunks
from backend.modules.rag.document_scope import document_ids_is_empty_allow_list
from backend.modules.rag.domain import RetrievalCoverage, RetrievalOutcome, RetrievedChunk
from backend.modules.rag.embeddings import EmbeddingService
from backend.modules.rag.enums import RetrievalIntent
from backend.modules.rag.evidence_revision import (
    StaleEvidenceRevisionError,
    assert_chunks_match_revision_allow_list,
    build_retrieved_evidence_revision_hash,
)
from backend.modules.rag.filters import exclude_injection_flagged_chunks
from backend.modules.rag.parent_context_service import expand_parent_chunks
from backend.modules.rag.query import QueryAnalysis, analyze_query
from backend.modules.rag.query_expansion import (
    QUERY_EXPANSION_VERSION,
    QueryExpansionService,
)
from backend.modules.rag.repository import RagRepository
from backend.modules.rag.rerank_policy import apply_rerank_policy
from backend.modules.rag.reranker_port import build_reranker
from backend.modules.rag.retrieval_cache import get_cached_retrieval, set_cached_retrieval
from backend.modules.rag.retrieval_fusion import reciprocal_rank_fusion
from backend.modules.rag.retrieval_planner import plan_retrieval
from backend.modules.rag.retrieval_request import RetrievalRequest
from backend.modules.rag.scope import RetrievalScope
from backend.modules.rag.search_repository import RagSearchRepository
from backend.modules.rag.source_diversifier import (
    diversify_by_document,
    filter_to_allow_list,
)
from backend.modules.rag.telemetry import RagTraceContext, traced
from backend.modules.rag.vector_store import _parse_scope, build_vector_store

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class RetrievalBranchResult:
    chunks: list[RetrievedChunk]
    succeeded: bool
    error: str | None
    duration_ms: int = 0


@dataclass(frozen=True, slots=True)
class RetrievalBranchRequest:
    scope: RetrievalScope
    query: str
    top_k: int
    query_embedding: list[float] | None = None
    embedding_task: asyncio.Task[list[list[float]]] | None = None
    phrase_boost: bool = False


@dataclass(frozen=True, slots=True)
class RetrievalTraceData:
    query: str
    user_id: str
    project_id: str | None
    conversation_id: str | None
    document_ids: list[str] | None
    latency_ms: int
    query_variants: list[dict] | None = None
    branch_errors: list[str] | None = None


@dataclass(frozen=True, slots=True)
class RetrievalCacheContext:
    filters: dict
    identity: dict
    variant: str


@dataclass(frozen=True, slots=True)
class RetrievalCacheInputs:
    document_ids: list[str] | None
    owner_scoped: bool
    intent: str
    retrieval_mode: str
    index_revision_ids: list[str] | None
    metadata: object | None
    evidence_revision_hash: str | None
    plan: object
    config: RagConfig
    ranker: object
    parent_context_enabled: bool


async def _completed_branch() -> RetrievalBranchResult:
    """Represent a deduplicated lexical branch without widening retrieval results."""
    return RetrievalBranchResult(chunks=[], succeeded=True, error=None)


async def _limited_branch(branch, semaphore, *, enabled: bool):
    if not enabled:
        return await branch
    async with semaphore:
        started = perf_counter()
        result = await branch
        if isinstance(result, RetrievalBranchResult):
            return replace(result, duration_ms=int((perf_counter() - started) * 1000))
        return result


async def _embed_query_variants(
    embeddings: EmbeddingService, texts: list[str]
) -> dict[str, list[float]]:
    unique_texts = list(dict.fromkeys(texts))
    vectors = await embeddings.embed_texts(unique_texts)
    if len(vectors) != len(unique_texts):
        raise ValueError("embedding provider returned an unexpected vector count")
    return dict(zip(unique_texts, vectors, strict=True))


def _coerce_branch_result(
    result: object,
) -> RetrievalBranchResult:
    """Normalize gather outcomes, including unexpected exceptions."""
    if isinstance(result, asyncio.CancelledError):
        raise result
    if isinstance(result, RetrievalBranchResult):
        return result
    if isinstance(result, Exception):
        return RetrievalBranchResult(chunks=[], succeeded=False, error=type(result).__name__)
    return RetrievalBranchResult(chunks=[], succeeded=False, error="invalid_branch_result")


def scope_hash_for_document_ids(document_ids: list[str] | None) -> str | None:
    if document_ids is None:
        return None
    payload = json.dumps(sorted(document_ids), separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()[:32]


def _coverage_for_chunks(
    chunks: list[RetrievedChunk], document_ids: list[str] | None
) -> RetrievalCoverage:
    documents_in_scope = len(document_ids) if document_ids is not None else 0
    documents_with_evidence = len({chunk.document_id for chunk in chunks})
    coverage_ratio = documents_with_evidence / documents_in_scope if documents_in_scope else 0.0
    return RetrievalCoverage(
        documents_in_scope=documents_in_scope,
        documents_with_retrieved_evidence=documents_with_evidence,
        retrieved_passage_count=len(chunks),
        coverage_ratio=coverage_ratio,
    )


def _assign_evidence_revision_hash(
    outcome: RetrievalOutcome,
    *,
    evidence_revision_hash: str | None,
    index_revision_ids: list[str] | None,
    project_id: str | None,
    document_ids: list[str] | None,
    config: RagConfig,
) -> None:
    """Bind evidence hash only after frozen revision membership is proven."""
    assert_chunks_match_revision_allow_list(outcome.chunks, index_revision_ids)
    if index_revision_ids is not None and evidence_revision_hash:
        # Frozen callers already proved the full revision hash; keep it only
        # after retrieved chunks are confirmed inside that revision allow-list.
        outcome.evidence_revision_hash = evidence_revision_hash
        return
    outcome.evidence_revision_hash = evidence_revision_hash or (
        build_retrieved_evidence_revision_hash(
            project_id=project_id,
            document_ids=document_ids,
            chunks=outcome.chunks,
            config=config,
        )
    )


def _filters_for_cache(
    document_ids: list[str] | None,
    *,
    owner_scoped: bool,
    intent: str,
    retrieval_mode: str = "hybrid",
    index_revision_ids: list[str] | None = None,
) -> dict:
    """Always include document_ids key when not None so [] ≠ omitted (I1/I5)."""
    filters: dict = {
        "owner_scoped": owner_scoped,
        "intent": intent,
        "retrieval_mode": retrieval_mode,
    }
    if document_ids is not None:
        filters["document_ids"] = sorted(document_ids)
    if index_revision_ids is not None:
        filters["index_revision_ids"] = sorted(index_revision_ids)
    return filters


def _build_retrieval_cache_context(inputs: RetrievalCacheInputs) -> RetrievalCacheContext:
    document_ids = inputs.document_ids
    owner_scoped = inputs.owner_scoped
    intent = inputs.intent
    retrieval_mode = inputs.retrieval_mode
    index_revision_ids = inputs.index_revision_ids
    metadata = inputs.metadata
    evidence_revision_hash = inputs.evidence_revision_hash
    plan = inputs.plan
    config = inputs.config
    ranker = inputs.ranker
    parent_context_enabled = inputs.parent_context_enabled
    filters = _filters_for_cache(
        document_ids,
        owner_scoped=owner_scoped,
        intent=intent,
        retrieval_mode=retrieval_mode,
        index_revision_ids=index_revision_ids,
    )
    if metadata is not None:
        filters["metadata"] = metadata.model_dump(mode="json", exclude_none=True)

    identity = {
        "artifact_version": getattr(config, "retrieval_cache_artifact_version", "v2"),
        "evidence_revision_hash": evidence_revision_hash,
        "index_revision_ids": sorted(index_revision_ids or []),
        "planner": plan.to_dict(),
        "retrieval_algorithm_version": getattr(
            config, "retrieval_algorithm_version", "hybrid-rrf-v2"
        ),
        "index_version": getattr(config, "index_version", "pgvector-fts-v1"),
        "rrf_k": getattr(config, "rrf_k", 60),
        "reranker": f"{ranker.name}:{ranker.version}",
        "parent_context_enabled": parent_context_enabled,
        "ranking_policy": "evidence-v2",
        "dense_min_cosine": getattr(config, "score_threshold", None),
        "dedupe_threshold": getattr(config, "context_overlap_dedupe_threshold", 0.8),
        "retrieval_fingerprint": (
            config.retrieval.fingerprint() if hasattr(config, "retrieval") else None
        ),
        "reranking_fingerprint": (
            config.reranking.fingerprint() if hasattr(config, "reranking") else None
        ),
    }
    variant = (
        f"{getattr(config, 'retrieval_algorithm_version', 'hybrid-rrf-v2')}"
        f":{getattr(config, 'index_version', 'pgvector-fts-v1')}"
        f":rerank={ranker.name}:{ranker.version}"
        f":mode={retrieval_mode}"
        f":children-only:parent={int(parent_context_enabled)}"
        f":xq={QUERY_EXPANSION_VERSION if plan.multi_query else 'none'}"
    )
    return RetrievalCacheContext(filters=filters, identity=identity, variant=variant)


def _actual_fusion_method(
    *,
    dense_ok: bool,
    lexical_ok: bool,
    dense_count: int,
    lexical_count: int,
    planned_dense: int,
    planned_lexical: int,
) -> str:
    """Describe what actually ran, not merely configuration."""
    if planned_dense <= 0 and planned_lexical > 0:
        return "lexical_only"
    if planned_lexical <= 0 and planned_dense > 0:
        return "dense_only"
    if dense_count and lexical_count and dense_ok and lexical_ok:
        return "rrf"
    if dense_count and dense_ok:
        return "dense_only"
    if lexical_count and lexical_ok:
        return "lexical_only"
    return "none"


def _classify_branch_degradation(
    *,
    dense_attempted: bool,
    lexical_attempted: bool,
    any_dense_ok: bool,
    any_lexical_ok: bool,
) -> tuple[bool, str | None]:
    """Classify retrieval degradation without mixing branch configuration and outcomes."""
    if dense_attempted and lexical_attempted:
        if any_dense_ok and not any_lexical_ok:
            return True, "lexical_branch_failed"
        if any_lexical_ok and not any_dense_ok:
            return True, "dense_branch_failed"
        if not any_dense_ok and not any_lexical_ok:
            return True, "both_branches_failed"
    elif dense_attempted and not any_dense_ok:
        return True, "dense_branch_failed"
    elif lexical_attempted and not any_lexical_ok:
        return True, "lexical_branch_failed"
    return False, None


def _retrieval_provenance(
    *,
    plan,
    config: RagConfig,
    ranker,
    fusion_method: str,
    dense_candidate_count: int,
    lexical_candidate_count: int,
    fused_candidate_count: int,
    query_variants: list[dict],
    chunks: list[RetrievedChunk],
    index_revision_ids: list[str] | None,
    query_analysis: QueryAnalysis,
) -> dict:
    """Persist the facts needed to reproduce a cached retrieval result."""
    return {
        "cache_artifact_version": getattr(config, "retrieval_cache_artifact_version", "v2"),
        "intent": plan.intent.value,
        "query_analysis": query_analysis.to_dict(),
        "retrieval_profile": plan.to_dict(),
        "retrieval_algorithm_version": getattr(
            config, "retrieval_algorithm_version", "hybrid-rrf-v2"
        ),
        "fusion_method": fusion_method,
        "dense_candidate_count": dense_candidate_count,
        "lexical_candidate_count": lexical_candidate_count,
        "fused_candidate_count": fused_candidate_count,
        "query_variants": query_variants,
        "query_expansion_version": (QUERY_EXPANSION_VERSION if len(query_variants) > 1 else None),
        "diversification_strategy": "per_document" if plan.diversify else "none",
        "source_cap": plan.max_per_document if plan.diversify else None,
        "reranker": f"{ranker.name}:{ranker.version}",
        "top_k": plan.top_k,
        "score_threshold": getattr(config, "score_threshold", None),
        "result_chunk_ids": [chunk.chunk_id for chunk in chunks],
        "index_revision_ids": list(
            dict.fromkeys(
                (index_revision_ids or [])
                + [chunk.index_revision_id for chunk in chunks if chunk.index_revision_id]
            )
        ),
    }


class RetrievalService:
    def __init__(self, db: AsyncSession, config: RagConfig | None = None):
        self.db = db
        self.config = config or RagConfig.from_settings()
        self.vector_store = build_vector_store(db, self.config)
        self.embeddings = EmbeddingService(self.config)
        self.ranker = build_reranker(config=self.config)
        self.repo = RagRepository(db)
        self.search_repo = RagSearchRepository(db)
        self.query_expansion = QueryExpansionService()
        self._db_branch_lock = asyncio.Lock()
        bind = db.bind if isinstance(db, AsyncSession) else None
        self._branch_session_factory = (
            async_sessionmaker(bind, expire_on_commit=False)
            if isinstance(bind, AsyncEngine)
            else None
        )

    @asynccontextmanager
    async def _database_branch(self):
        if self._branch_session_factory is not None:
            async with self._branch_session_factory() as branch_db:
                yield branch_db
            return

        # Connection-bound test sessions cannot create an independent session.
        # Keep those serialized; production engine-bound sessions use fresh sessions.
        if isinstance(self.db, AsyncSession):
            async with self._db_branch_lock, self.db.begin_nested():
                yield self.db
        else:
            yield self.db

    async def _empty_allow_list_outcome(
        self,
        *,
        request: RetrievalRequest,
        plan,
        document_ids: list[str] | None,
        index_revision_ids: list[str] | None,
        persist_trace: bool,
    ) -> RetrievalOutcome:
        """Return the zero-evidence outcome for an explicit empty allow-list (I1)."""
        coverage = RetrievalCoverage(
            documents_in_scope=0,
            documents_with_retrieved_evidence=0,
            retrieved_passage_count=0,
            coverage_ratio=0.0,
        )
        outcome = RetrievalOutcome(
            chunks=[],
            no_matches=True,
            intent=plan.intent,
            fusion_method="none",
            coverage=coverage,
            scope_hash=scope_hash_for_document_ids(document_ids),
        )
        _assign_evidence_revision_hash(
            outcome,
            evidence_revision_hash=request.evidence_revision_hash,
            index_revision_ids=index_revision_ids,
            project_id=request.project_id,
            document_ids=document_ids,
            config=self.config,
        )
        if persist_trace:
            outcome = await self._persist_trace(
                outcome,
                RetrievalTraceData(
                    query=request.query,
                    user_id=request.user_id,
                    project_id=request.project_id,
                    conversation_id=request.conversation_id,
                    document_ids=document_ids,
                    latency_ms=0,
                ),
            )
        return outcome

    @traced("rag.retrieval")
    async def retrieve(self, request: RetrievalRequest) -> RetrievalOutcome:
        async with asyncio.timeout(max(0.1, float(settings.RAG_RETRIEVAL_TIMEOUT_SECONDS))):
            return await self._retrieve(request)

    async def _retrieve(self, request: RetrievalRequest) -> RetrievalOutcome:
        query = request.query
        user_id = request.user_id
        project_id = request.project_id
        top_k = request.top_k
        filters = request.filters
        intent = request.intent
        conversation_id = request.conversation_id
        persist_trace = request.persist_trace and not request.preview
        evidence_revision_hash = request.evidence_revision_hash
        trace_context = RagTraceContext()
        if not self.config.enabled:
            return RetrievalOutcome(chunks=[], no_matches=True, request_id=trace_context.request_id)

        document_ids, owner_scoped = _parse_scope(dict(filters) if filters is not None else None)
        index_revision_ids = (filters or {}).get("index_revision_ids")
        retrieval_mode = str((filters or {}).get("retrieval_mode") or "hybrid").lower()
        with trace.get_tracer("backend.rag").start_as_current_span(
            "rag.query_analysis", record_exception=False, set_status_on_exception=False
        ):
            query_analysis = analyze_query(query)
            if intent is not None:
                query_analysis = replace(
                    query_analysis, intent=RetrievalIntent(intent), reasons=("caller_override",)
                )
            plan = plan_retrieval(
                query_analysis.intent,
                self.config,
                top_k=top_k,
                retrieval_mode=retrieval_mode,
                lexical_phrase_boost=query_analysis.lexical_phrase_boost,
            )
        span = trace.get_current_span()
        span.set_attributes(
            {
                "request_id": trace_context.request_id,
                "retrieval.intent": plan.intent.value,
                "retrieval.top_k": plan.top_k,
                "retrieval.document_count": len(document_ids) if document_ids is not None else -1,
                "retrieval.reranker": self.ranker.name,
            }
        )
        parent_context_enabled = (
            bool(getattr(self.config, "parent_context_enabled", False)) and request.metadata is None
        )
        prefer_coverage = plan.intent in {RetrievalIntent.COMPARISON, RetrievalIntent.SYNTHESIS}
        retrieval_scope = RetrievalScope(
            user_id=user_id,
            project_id=project_id,
            document_ids=tuple(document_ids) if document_ids is not None else None,
            owner_scoped=owner_scoped,
            exclude_parents=True,
            index_revision_ids=(
                tuple(index_revision_ids) if index_revision_ids is not None else None
            ),
            metadata=request.metadata,
        )

        # I1: explicit empty allow-list → zero evidence, never widen.
        if document_ids_is_empty_allow_list(document_ids):
            return await self._empty_allow_list_outcome(
                request=request,
                plan=plan,
                document_ids=document_ids,
                index_revision_ids=index_revision_ids,
                persist_trace=persist_trace,
            )

        cache_context = _build_retrieval_cache_context(
            RetrievalCacheInputs(
                document_ids=document_ids,
                owner_scoped=owner_scoped,
                intent=plan.intent.value,
                retrieval_mode=retrieval_mode,
                index_revision_ids=index_revision_ids,
                metadata=request.metadata,
                evidence_revision_hash=evidence_revision_hash,
                plan=plan,
                config=self.config,
                ranker=self.ranker,
                parent_context_enabled=parent_context_enabled,
            )
        )
        started = perf_counter()
        query_variants_meta: list[dict] = []
        try:
            cache_started = trace_context.measure("cache_lookup")
            cached = (
                None
                if request.preview
                else await get_cached_retrieval(
                    user_id=user_id,
                    project_id=project_id,
                    query=query,
                    top_k=plan.top_k,
                    filters=cache_context.filters,
                    variant=cache_context.variant,
                    identity=cache_context.identity,
                    expected_revision_ids=index_revision_ids,
                )
            )
            if cached is not None and owner_scoped and cached.chunks:
                document_set = {chunk.document_id for chunk in cached.chunks}
                async with self._database_branch() as branch_db:
                    repo = self.repo if branch_db is self.db else RagRepository(branch_db)
                    allowed = await repo.filter_document_ids_for_user(
                        user_id, list(document_set), project_id=project_id
                    )
                if set(allowed) != document_set:
                    cached = None
            trace_context.complete(
                "cache_lookup",
                cache_started,
                status="bypassed" if request.preview else "hit" if cached is not None else "miss",
            )
            span.set_attribute("retrieval.cache_hit", cached is not None)
            if cached is not None:
                try:
                    cached_intent = RetrievalIntent(
                        cached.provenance.get("intent", plan.intent.value)
                    )
                except ValueError:
                    cached_intent = plan.intent
                filtered, removed = exclude_injection_flagged_chunks(cached.chunks)
                filtered = filter_to_allow_list(filtered, document_ids)
                if plan.diversify:
                    filtered, coverage = diversify_by_document(
                        filtered,
                        limit=plan.top_k,
                        max_per_document=plan.max_per_document,
                        documents_in_scope=len(document_ids) if document_ids is not None else 0,
                        prefer_coverage=prefer_coverage,
                    )
                else:
                    coverage = _coverage_for_chunks(filtered, document_ids)
                if removed:
                    metrics.rag_injection_chunks_filtered_total.inc(removed)
                metrics.rag_retrieved_chunks.observe(len(filtered))
                if parent_context_enabled and filtered:
                    filtered = await expand_parent_chunks(
                        filtered,
                        repo=self.repo,
                        user_id=user_id,
                        project_id=project_id,
                        document_ids=document_ids,
                    )
                    filtered = filter_to_allow_list(filtered, document_ids)
                outcome = RetrievalOutcome(
                    chunks=filtered,
                    injection_chunks_filtered=removed,
                    no_matches=len(filtered) == 0,
                    intent=cached_intent,
                    fusion_method=cached.provenance.get("fusion_method"),
                    coverage=coverage,
                    dense_candidate_count=int(cached.provenance.get("dense_candidate_count", 0)),
                    lexical_candidate_count=int(
                        cached.provenance.get("lexical_candidate_count", 0)
                    ),
                    fused_candidate_count=int(cached.provenance.get("fused_candidate_count", 0)),
                    scope_hash=scope_hash_for_document_ids(document_ids),
                    cache_hit=True,
                    retrieval_provenance=cached.provenance,
                    request_id=trace_context.request_id,
                )
                outcome.retrieval_provenance = {
                    **outcome.retrieval_provenance,
                    "trace": {
                        "request_id": trace_context.request_id,
                        "stage_timings_ms": trace_context.stage_timings_ms,
                        "branch_status": trace_context.branch_status,
                    },
                }
                _assign_evidence_revision_hash(
                    outcome,
                    evidence_revision_hash=evidence_revision_hash,
                    index_revision_ids=index_revision_ids,
                    project_id=project_id,
                    document_ids=document_ids,
                    config=self.config,
                )
                if persist_trace:
                    outcome = await self._persist_trace(
                        outcome,
                        RetrievalTraceData(
                            query=query,
                            user_id=user_id,
                            project_id=project_id,
                            conversation_id=conversation_id,
                            document_ids=document_ids,
                            latency_ms=int((perf_counter() - started) * 1000),
                            query_variants=cached.provenance.get("query_variants", []),
                        ),
                    )
                return outcome

            expansion_started = trace_context.measure("query_expansion")
            variants = self.query_expansion.expand_if_needed(query, multi_query=plan.multi_query)
            trace_context.complete("query_expansion", expansion_started)
            ranked_lists: list[list[RetrievedChunk]] = []
            total_dense = 0
            total_lexical = 0
            dense_work_ms = 0
            lexical_work_ms = 0
            any_dense_ok = False
            any_lexical_ok = False
            dense_attempted = plan.dense_candidates > 0
            lexical_attempted = plan.lexical_candidates > 0
            branch_errors: list[str] = []
            dense_started = trace_context.measure("dense_branch")
            lexical_started = trace_context.measure("lexical_branch")

            lexical_queries_seen: set[str] = set()
            run_lexical_flags: list[bool] = []
            for variant in variants:
                query_variants_meta.append(
                    {
                        "label": variant.label,
                        "text": variant.text,
                        "dense_text": variant.dense_text or variant.text,
                        "lexical_text": variant.lexical_text or variant.text,
                        "language": variant.language,
                    }
                )
                lexical_query = variant.lexical_text or variant.text
                if lexical_query in lexical_queries_seen:
                    run_lexical_flags.append(False)
                else:
                    lexical_queries_seen.add(lexical_query)
                    run_lexical_flags.append(True)

            variant_concurrency = max(1, int(getattr(self.config, "query_variant_concurrency", 3)))
            variant_semaphore = asyncio.Semaphore(variant_concurrency)
            branch_semaphore = asyncio.Semaphore(
                max(1, int(getattr(self.config, "retrieval_branch_concurrency", 2)))
            )

            dense_texts = (
                list(dict.fromkeys(variant.dense_text or variant.text for variant in variants))
                if dense_attempted
                else []
            )
            embedding_batch_task = (
                asyncio.create_task(_embed_query_variants(self.embeddings, dense_texts))
                if dense_texts
                else None
            )
            embedding_tasks: dict[str, asyncio.Task[list[list[float]]]] = {}
            embedding_guard = asyncio.Lock()

            async def shared_embedding_task(text: str) -> asyncio.Task[list[list[float]]]:
                async with embedding_guard:
                    task = embedding_tasks.get(text)
                    if task is None:

                        async def get_vector() -> list[list[float]]:
                            if embedding_batch_task is None:
                                raise RuntimeError("dense embedding batch was not scheduled")
                            return [(await embedding_batch_task)[text]]

                        task = asyncio.create_task(get_vector())
                        embedding_tasks[text] = task
                    return task

            async def run_variant(index: int):
                variant = variants[index]
                dense_text = variant.dense_text or variant.text
                lexical_query = variant.lexical_text or variant.text
                async with variant_semaphore:
                    embedding_task = (
                        await shared_embedding_task(dense_text)
                        if plan.dense_candidates > 0
                        else None
                    )
                    dense_task = self._dense_branch(
                        RetrievalBranchRequest(
                            scope=retrieval_scope,
                            query=dense_text,
                            top_k=plan.dense_candidates,
                            embedding_task=embedding_task,
                        )
                    )
                    if run_lexical_flags[index]:
                        lexical_task = self._lexical_branch(
                            RetrievalBranchRequest(
                                scope=retrieval_scope,
                                query=lexical_query,
                                top_k=plan.lexical_candidates,
                                phrase_boost=plan.lexical_phrase_boost,
                            )
                        )
                    else:
                        lexical_task = _completed_branch()
                    dense_raw, lexical_raw = await asyncio.gather(
                        _limited_branch(
                            dense_task, branch_semaphore, enabled=plan.dense_candidates > 0
                        ),
                        _limited_branch(
                            lexical_task,
                            branch_semaphore,
                            enabled=(run_lexical_flags[index] and plan.lexical_candidates > 0),
                        ),
                        return_exceptions=True,
                    )
                    return index, dense_raw, lexical_raw

            variant_tasks = [
                asyncio.create_task(run_variant(index)) for index in range(len(variants))
            ]
            try:
                variant_outcomes = await asyncio.gather(*variant_tasks)
            except BaseException:
                for task in variant_tasks:
                    task.cancel()
                if embedding_batch_task is not None:
                    embedding_batch_task.cancel()
                await asyncio.gather(
                    *variant_tasks,
                    *([embedding_batch_task] if embedding_batch_task is not None else []),
                    return_exceptions=True,
                )
                raise
            for _index, dense_raw, lexical_raw in sorted(
                variant_outcomes, key=lambda item: item[0]
            ):
                dense_result = _coerce_branch_result(dense_raw)
                lexical_result = _coerce_branch_result(lexical_raw)
                dense = dense_result.chunks
                dense_ok = dense_result.succeeded
                dense_err = dense_result.error
                lexical = lexical_result.chunks
                lexical_ok = lexical_result.succeeded
                lexical_err = lexical_result.error
                if dense_err:
                    branch_errors.append(f"dense:{dense_err}")
                if lexical_err:
                    branch_errors.append(f"lexical:{lexical_err}")
                dense_work_ms += dense_result.duration_ms
                lexical_work_ms += lexical_result.duration_ms
                if dense_attempted and dense_ok:
                    any_dense_ok = True
                if lexical_attempted and run_lexical_flags[_index] and lexical_ok:
                    any_lexical_ok = True
                dense = filter_to_allow_list(dense, document_ids)
                lexical = filter_to_allow_list(lexical, document_ids)
                total_dense += len(dense)
                total_lexical += len(lexical)
                if dense and lexical:
                    ranked_lists.append(dense)
                    ranked_lists.append(lexical)
                elif dense:
                    ranked_lists.append(dense)
                elif lexical:
                    ranked_lists.append(lexical)

            trace_context.complete(
                "dense_branch",
                dense_started,
                status=("ok" if any_dense_ok else "failed") if dense_attempted else "skipped",
            )
            trace_context.complete(
                "lexical_branch",
                lexical_started,
                status=("ok" if any_lexical_ok else "failed") if lexical_attempted else "skipped",
            )
            trace_context.stage_timings_ms.update(
                dense_work=dense_work_ms, lexical_work=lexical_work_ms
            )
            fusion_started = trace_context.measure("fusion")
            if len(ranked_lists) > 1:
                fused = reciprocal_rank_fusion(
                    ranked_lists,
                    k=getattr(self.config, "rrf_k", 60),
                    limit=max(plan.top_k * 3, plan.rerank_depth),
                )
            elif ranked_lists:
                fused = ranked_lists[0]
            else:
                fused = []
            fused = filter_to_allow_list(fused, document_ids)
            trace_context.complete("fusion", fusion_started)

            fusion_method = _actual_fusion_method(
                dense_ok=any_dense_ok,
                lexical_ok=any_lexical_ok,
                dense_count=total_dense,
                lexical_count=total_lexical,
                planned_dense=plan.dense_candidates,
                planned_lexical=plan.lexical_candidates,
            )
            if plan.multi_query and len(variants) > 1 and fused:
                fusion_method = (
                    f"multi_query_rrf:{QUERY_EXPANSION_VERSION}"
                    if len(ranked_lists) > 1
                    else fusion_method
                )

            degraded, degradation_reason = _classify_branch_degradation(
                dense_attempted=dense_attempted,
                lexical_attempted=lexical_attempted,
                any_dense_ok=any_dense_ok,
                any_lexical_ok=any_lexical_ok,
            )

            if degraded:
                metrics.rag_retrieval_degraded_total.inc()
                if "dense" in (degradation_reason or ""):
                    metrics.rag_vector_unavailable_total.inc()

            filtered, removed = exclude_injection_flagged_chunks(fused)
            if removed:
                metrics.rag_injection_chunks_filtered_total.inc(removed)

            rerank_state = {"status": "skipped", "applied": "noop:v1", "candidate_count": 0}
            if filtered and plan.rerank_depth:
                rerank_started = perf_counter()
                rerank_result = await apply_rerank_policy(
                    self.ranker,
                    query,
                    filtered,
                    depth=plan.rerank_depth,
                    timeout_seconds=getattr(self.config, "rerank_timeout_seconds", 2.0),
                )
                metrics.rag_rerank_latency_ms.observe((perf_counter() - rerank_started) * 1000)
                filtered = rerank_result.chunks
                rerank_state["candidate_count"] = rerank_result.candidate_count
                if rerank_result.failed:
                    rerank_state.update(status="fallback", reason=rerank_result.fallback_reason)
                    if not degraded:
                        metrics.rag_retrieval_degraded_total.inc()
                    degraded = True
                    degradation_reason = ";".join(
                        reason for reason in (degradation_reason, "reranker_failed") if reason
                    )
                elif rerank_result.attempted:
                    rerank_state.update(
                        status="applied", applied=f"{self.ranker.name}:{self.ranker.version}"
                    )
                trace_context.complete("rerank", rerank_started, status=rerank_state["status"])

            selection = select_context_chunks(
                [replace(chunk, rank=rank) for rank, chunk in enumerate(filtered, start=1)],
                overlap_threshold=getattr(self.config, "context_overlap_dedupe_threshold", 0.8),
            )
            filtered = selection.chunks

            if plan.diversify:
                filtered, coverage = diversify_by_document(
                    filtered,
                    limit=plan.top_k,
                    max_per_document=plan.max_per_document,
                    documents_in_scope=len(document_ids) if document_ids is not None else 0,
                    prefer_coverage=prefer_coverage,
                )
            else:
                filtered = filtered[: plan.top_k]
                for idx, chunk in enumerate(filtered, start=1):
                    chunk.rank = idx
                coverage = _coverage_for_chunks(filtered, document_ids)

            if parent_context_enabled and filtered:
                parent_started = trace_context.measure("parent_expand")
                filtered = await expand_parent_chunks(
                    filtered,
                    repo=self.repo,
                    user_id=user_id,
                    project_id=project_id,
                    document_ids=document_ids,
                )
                trace_context.complete("parent_expand", parent_started)

            outcome = RetrievalOutcome(
                chunks=filtered,
                injection_chunks_filtered=removed,
                no_matches=len(filtered) == 0,
                intent=plan.intent,
                fusion_method=fusion_method,
                coverage=coverage,
                dense_candidate_count=total_dense,
                lexical_candidate_count=total_lexical,
                fused_candidate_count=len(fused),
                scope_hash=scope_hash_for_document_ids(document_ids),
                degraded=degraded,
                degradation_reason=degradation_reason,
                request_id=trace_context.request_id,
            )
            outcome.retrieval_provenance = _retrieval_provenance(
                plan=plan,
                config=self.config,
                ranker=self.ranker,
                fusion_method=fusion_method,
                dense_candidate_count=total_dense,
                lexical_candidate_count=total_lexical,
                fused_candidate_count=len(fused),
                query_variants=query_variants_meta,
                chunks=filtered,
                index_revision_ids=index_revision_ids,
                query_analysis=query_analysis,
            )
            outcome.retrieval_provenance["trace"] = {
                "request_id": trace_context.request_id,
                "stage_timings_ms": trace_context.stage_timings_ms,
                "branch_status": trace_context.branch_status,
            }
            outcome.retrieval_provenance["reranker"] = rerank_state["applied"]
            outcome.retrieval_provenance["reranking"] = {
                **rerank_state,
                "configured": f"{self.ranker.name}:{self.ranker.version}",
            }
            outcome.retrieval_provenance["deduplicated_chunk_ids"] = selection.removed_chunk_ids
            _assign_evidence_revision_hash(
                outcome,
                evidence_revision_hash=evidence_revision_hash,
                index_revision_ids=index_revision_ids,
                project_id=project_id,
                document_ids=document_ids,
                config=self.config,
            )
            if outcome.no_matches and fused and removed == len(fused):
                outcome.degradation_reason = "injection_filtered_all_matches"
                outcome.degraded = True

            if not request.preview and removed == 0 and not degraded:
                await set_cached_retrieval(
                    user_id=user_id,
                    project_id=project_id,
                    query=query,
                    top_k=plan.top_k,
                    filters=cache_context.filters,
                    chunks=filtered,
                    provenance=outcome.retrieval_provenance,
                    variant=cache_context.variant,
                    identity=cache_context.identity,
                    artifact_version=getattr(self.config, "retrieval_cache_artifact_version", "v2"),
                )
            metrics.rag_retrieved_chunks.observe(len(filtered))
            if outcome.no_matches:
                metrics.rag_retrieval_no_match_total.inc()
            if persist_trace:
                outcome = await self._persist_trace(
                    outcome,
                    RetrievalTraceData(
                        query=query,
                        user_id=user_id,
                        project_id=project_id,
                        conversation_id=conversation_id,
                        document_ids=document_ids,
                        latency_ms=int((perf_counter() - started) * 1000),
                        query_variants=query_variants_meta,
                        branch_errors=branch_errors,
                    ),
                )
            return outcome
        except StaleEvidenceRevisionError:
            raise
        except Exception:
            logger.exception("RAG retrieval failed for user=%s", user_id)
            metrics.rag_vector_unavailable_total.inc()
            metrics.rag_retrieval_degraded_total.inc()
            outcome = RetrievalOutcome(
                chunks=[],
                degraded=True,
                degradation_reason="retrieval_failed",
                intent=plan.intent,
                fusion_method="none",
                scope_hash=scope_hash_for_document_ids(document_ids),
                request_id=trace_context.request_id,
            )
            _assign_evidence_revision_hash(
                outcome,
                evidence_revision_hash=evidence_revision_hash,
                index_revision_ids=index_revision_ids,
                project_id=project_id,
                document_ids=document_ids,
                config=self.config,
            )
            if persist_trace:
                try:
                    outcome = await self._persist_trace(
                        outcome,
                        RetrievalTraceData(
                            query=query,
                            user_id=user_id,
                            project_id=project_id,
                            conversation_id=conversation_id,
                            document_ids=document_ids,
                            latency_ms=int((perf_counter() - started) * 1000),
                            query_variants=query_variants_meta,
                        ),
                    )
                except Exception:
                    logger.exception("Failed to persist degraded retrieval trace")
            return outcome
        finally:
            trace_context.close()
            metrics.rag_retrieval_latency_ms.observe((perf_counter() - started) * 1000)

    @traced("rag.dense")
    async def _dense_branch(self, branch: RetrievalBranchRequest) -> RetrievalBranchResult:
        if branch.top_k <= 0:
            return RetrievalBranchResult(chunks=[], succeeded=True, error=None)
        try:
            query_embedding = branch.query_embedding
            if query_embedding is None:
                if branch.embedding_task is not None:
                    query_embedding = (await branch.embedding_task)[0]
                else:
                    query_embedding = (await self.embeddings.embed_texts([branch.query]))[0]
            if not can_index_embedding(
                query_embedding,
                expected_dimensions=self.config.embedding_dimensions,
            ):
                return RetrievalBranchResult(
                    chunks=[], succeeded=False, error="embedding_dimension_mismatch"
                )
            search_filters: dict = {
                "owner_scoped": branch.scope.owner_scoped,
                "exclude_parents": branch.scope.exclude_parents,
            }
            if branch.scope.document_ids is not None:
                search_filters["document_ids"] = list(branch.scope.document_ids)
            if branch.scope.index_revision_ids is not None:
                search_filters["index_revision_ids"] = list(branch.scope.index_revision_ids)
            if branch.scope.metadata is not None:
                search_filters["metadata"] = branch.scope.metadata
            async with self._database_branch() as branch_db:
                vector_store = (
                    self.vector_store
                    if branch_db is self.db
                    else build_vector_store(branch_db, self.config)
                )
                dense = await vector_store.similarity_search(
                    branch.query,
                    user_id=branch.scope.user_id,
                    project_id=branch.scope.project_id,
                    top_k=branch.top_k,
                    filters=search_filters,
                    query_embedding=query_embedding,
                )
            return RetrievalBranchResult(chunks=dense or [], succeeded=True, error=None)
        except Exception as exc:
            logger.exception("Dense retrieval branch failed")
            return RetrievalBranchResult(chunks=[], succeeded=False, error=type(exc).__name__)

    @traced("rag.lexical")
    async def _lexical_branch(self, branch: RetrievalBranchRequest) -> RetrievalBranchResult:
        if branch.top_k <= 0:
            return RetrievalBranchResult(chunks=[], succeeded=True, error=None)
        try:
            async with self._database_branch() as branch_db:
                search_repo = (
                    self.search_repo if branch_db is self.db else RagSearchRepository(branch_db)
                )
                lexical = await search_repo.lexical_search(
                    scope=branch.scope,
                    query=branch.query,
                    top_k=branch.top_k,
                    phrase_boost=branch.phrase_boost,
                )
            return RetrievalBranchResult(chunks=lexical, succeeded=True, error=None)
        except Exception as exc:
            logger.exception("Lexical retrieval branch failed")
            return RetrievalBranchResult(chunks=[], succeeded=False, error=type(exc).__name__)

    @traced("rag.persistence")
    async def _persist_trace(
        self,
        outcome: RetrievalOutcome,
        data: RetrievalTraceData,
    ) -> RetrievalOutcome:
        chunk_revision_ids = list(
            dict.fromkeys(
                chunk.index_revision_id for chunk in outcome.chunks if chunk.index_revision_id
            )
        )
        outcome.index_revision_ids = (
            chunk_revision_ids
            or outcome.retrieval_provenance.get("index_revision_ids", [])
            or await self.repo.list_current_revision_ids(data.document_ids)
        )
        coverage = outcome.coverage
        provenance = dict(outcome.retrieval_provenance)
        trace_diagnostics = provenance.get("trace") or {}
        trace = await self.repo.create_retrieval_trace(
            user_id=data.user_id,
            project_id=data.project_id,
            conversation_id=data.conversation_id,
            query=data.query,
            request_id=outcome.request_id or trace_diagnostics.get("request_id"),
            intent=outcome.intent.value if outcome.intent else None,
            scope_hash=outcome.scope_hash,
            evidence_revision_hash=outcome.evidence_revision_hash,
            index_revision_ids=outcome.index_revision_ids,
            document_ids=data.document_ids,
            retrieved_chunks=[
                {
                    "chunk_id": c.chunk_id,
                    "citation_chunk_id": c.citation_chunk_id or c.chunk_id,
                    "document_id": c.document_id,
                    "score": c.score,
                    "rank": c.rank,
                    "filename": c.filename,
                    "chunk_index": c.chunk_index,
                    "page_number": c.page_number,
                    "citation_content": c.citation_content or c.content,
                    "snippet": (c.citation_content or c.content)[:400],
                    "char_start": (c.metadata or {}).get("char_start"),
                    "char_end": (c.metadata or {}).get("char_end"),
                    "source_unit_ids": (c.metadata or {}).get("source_unit_ids")
                    or (c.metadata or {}).get("source_span_ids"),
                    "offset_coordinate_system": (c.metadata or {}).get("offset_coordinate_system"),
                    "parent_context_id": c.parent_context_id,
                    "index_revision_id": c.index_revision_id,
                    "context_content": c.context_content,
                    "context_snippet": (
                        c.context_content[:400] if c.context_content is not None else None
                    ),
                    "retrieval_sources": list(c.retrieval_sources),
                }
                for c in outcome.chunks
            ],
            coverage={
                "documents_in_scope": coverage.documents_in_scope if coverage else 0,
                "documents_with_retrieved_evidence": (
                    coverage.documents_with_retrieved_evidence if coverage else 0
                ),
                "retrieved_passage_count": coverage.retrieved_passage_count if coverage else 0,
                "coverage_ratio": coverage.coverage_ratio if coverage else 0.0,
            },
            config={
                **provenance,
                "cache_hit": outcome.cache_hit,
                "original_fusion_method": provenance.get("fusion_method", outcome.fusion_method),
                "fusion_method": outcome.fusion_method,
                "retrieval_algorithm_version": provenance.get(
                    "retrieval_algorithm_version",
                    getattr(self.config, "retrieval_algorithm_version", "hybrid-rrf-v2"),
                ),
                "index_version": getattr(self.config, "index_version", "pgvector-fts-v1"),
                "dense_candidate_count": provenance.get(
                    "dense_candidate_count", outcome.dense_candidate_count
                ),
                "lexical_candidate_count": provenance.get(
                    "lexical_candidate_count", outcome.lexical_candidate_count
                ),
                "fused_candidate_count": provenance.get(
                    "fused_candidate_count", outcome.fused_candidate_count
                ),
                "reranker": provenance.get("reranker", f"{self.ranker.name}:{self.ranker.version}"),
                "query_variants": provenance.get("query_variants", data.query_variants or []),
                "query_expansion_version": (
                    provenance.get("query_expansion_version")
                    if provenance
                    else (
                        QUERY_EXPANSION_VERSION
                        if data.query_variants and len(data.query_variants) > 1
                        else None
                    )
                ),
                "branch_errors": data.branch_errors or [],
                "original_query": data.query,
            },
            degraded=outcome.degraded,
            degradation_reason=outcome.degradation_reason,
            no_matches=outcome.no_matches,
            injection_chunks_filtered=outcome.injection_chunks_filtered,
            latency_ms=data.latency_ms,
            stage_timings=trace_diagnostics.get("stage_timings_ms"),
            branch_status=trace_diagnostics.get("branch_status"),
        )
        outcome.retrieval_trace_id = trace.id
        return outcome
