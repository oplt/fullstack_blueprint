import asyncio
import json
from contextlib import suppress
from dataclasses import replace

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.db.dependencies import get_db
from backend.core.pagination import (
    PaginatedResponse,
    PaginationParams,
    paginated_response,
    pagination_params,
)
from backend.core.storage import ObjectStorageError, object_storage
from backend.core.text_snippet import text_snippet
from backend.modules.ai.dependencies import enforce_ai_generation_rate_limit
from backend.modules.identity.dependencies import get_current_user
from backend.modules.identity.models import User
from backend.modules.rag.config import RagConfig
from backend.modules.rag.domain import RetrievalOutcome, RetrievalRequest
from backend.modules.rag.jobs import queue_document_indexing
from backend.modules.rag.retrieval import RetrievalService
from backend.modules.rag.schemas import (
    RagAskRequest,
    RagAskResponse,
    RagChunkResponse,
    RagCitationResponse,
    RagClaimResponse,
    RagCompareRequest,
    RagCompareResponse,
    RagCoverageResponse,
    RagDocumentResponse,
    RagDocumentUploadResponse,
    RagIngestionJobResponse,
    RagQueryResponse,
    RagRetrievalDiagnostics,
    RagRetrievedChunkResponse,
    RagRetrieveRequest,
    RagRetrieveResponse,
    RagSourcePreviewResponse,
)
from backend.modules.rag.service import RagPipelineService, RagReadService

router = APIRouter()


def _require_rag_enabled() -> None:
    if not RagConfig.from_settings().enabled:
        raise HTTPException(status_code=503, detail="RAG is disabled")


def _document_to_response(document) -> RagDocumentResponse:
    return RagDocumentResponse(
        id=document.id,
        user_id=document.user_id,
        project_id=document.project_id,
        organization_id=document.organization_id,
        filename=document.filename,
        original_filename=document.original_filename,
        content_type=document.content_type,
        storage_path=None,
        status=document.status,
        source_type=document.source_type,
        current_revision_id=document.current_revision_id,
        metadata=json.loads(document.metadata_json or "{}"),
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


@router.post("/documents/upload", response_model=RagDocumentUploadResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    project_id: str | None = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_rag_enabled()
    service = RagPipelineService(db).ingestion
    document, job, _ = await service.upload_document(
        user_id=current_user.id,
        filename=file.filename or "upload.bin",
        content_type=file.content_type or "application/octet-stream",
        project_id=project_id,
        upload=file,
    )
    queue_document_indexing(
        document_id=document.id,
        user_id=current_user.id,
        job_id=job.id,
    )
    return RagDocumentUploadResponse(
        document=_document_to_response(document),
        ingestion_job=RagIngestionJobResponse.model_validate(job),
    )


@router.get("/documents", response_model=PaginatedResponse[RagDocumentResponse])
async def list_documents(
    project_id: str | None = None,
    pagination: PaginationParams = Depends(pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_rag_enabled()
    repo = RagReadService(db)
    docs, total = await repo.list_documents_for_user(
        current_user.id,
        project_id=project_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return paginated_response(
        [_document_to_response(doc) for doc in docs],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/documents/{document_id}", response_model=RagDocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_rag_enabled()
    repo = RagReadService(db)
    document = await repo.get_document(document_id, user_id=current_user.id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return _document_to_response(document)


@router.delete("/documents/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_rag_enabled()
    service = RagPipelineService(db).ingestion
    await service.delete_document(
        document_id=document_id,
        user_id=current_user.id,
        is_admin=current_user.is_admin,
    )


@router.post(
    "/documents/{document_id}/index",
    response_model=RagIngestionJobResponse,
    status_code=202,
)
async def index_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_rag_enabled()
    service = RagPipelineService(db).ingestion
    job = await service.enqueue_document_indexing(
        document_id=document_id,
        user_id=current_user.id,
        is_admin=current_user.is_admin,
    )
    return RagIngestionJobResponse.model_validate(job)


@router.get(
    "/documents/{document_id}/chunks",
    response_model=PaginatedResponse[RagChunkResponse],
)
async def list_document_chunks(
    document_id: str,
    pagination: PaginationParams = Depends(pagination_params),
    content_mode: str = Query(
        default="snippet",
        pattern="^(snippet|full)$",
        description="Return truncated chunk previews (snippet) or full chunk text (full).",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_rag_enabled()
    repo = RagReadService(db)
    document = await repo.get_document(document_id, user_id=current_user.id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    chunks, total = await repo.list_chunks_for_document(
        document_id,
        limit=pagination.limit,
        offset=pagination.offset,
    )

    def chunk_content(raw: str) -> str:
        if content_mode == "full":
            return raw
        return text_snippet(raw)

    return paginated_response(
        [
            RagChunkResponse(
                id=chunk.id,
                document_id=chunk.document_id,
                chunk_index=chunk.chunk_index,
                content=chunk_content(chunk.content),
                token_count=chunk.token_count,
                metadata=json.loads(chunk.metadata_json or "{}"),
                revision_id=chunk.revision_id,
            )
            for chunk in chunks
        ],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.post("/retrieve", response_model=RagRetrieveResponse)
async def retrieve_chunks(
    payload: RagRetrieveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_rag_enabled()
    service = RagPipelineService(db)
    filters: dict[str, object] = {"owner_scoped": True, "retrieval_mode": payload.retrieval_mode}
    if payload.document_ids is not None:
        filters["document_ids"] = payload.document_ids
    try:
        outcome = await service.retrieval.retrieve(
            RetrievalRequest(
                query=payload.query,
                user_id=current_user.id,
                project_id=payload.project_id,
                top_k=payload.top_k,
                filters=filters,
                metadata=payload.metadata_filter,
                intent=payload.intent,
                persist_trace=False,
            )
        )
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="RAG retrieval timed out") from exc
    return _retrieval_response(outcome, service.config)


def _retrieval_response(
    outcome: RetrievalOutcome, config: RagConfig, *, preview: bool = False
) -> RagRetrieveResponse:
    provenance = outcome.retrieval_provenance
    profile = provenance.get("retrieval_profile") or {}
    timing = provenance.get("trace") or {}
    method = outcome.fusion_method or ""
    if method == "rrf" or method.startswith("multi_query_rrf:"):
        score_kind = "rrf"
    elif method == "dense_only":
        score_kind = "cosine"
    elif method == "lexical_only":
        score_kind = "lexical_rank"
    else:
        score_kind = "none"
    diagnostics = RagRetrievalDiagnostics(
        score_kind=score_kind,
        cache="bypassed" if preview else "hit" if outcome.cache_hit else "miss",
        min_cosine=config.score_threshold,
        rrf_k=config.rrf_k,
        dense_pool=profile.get("dense_candidates", 0),
        lexical_pool=profile.get("lexical_candidates", 0),
        rerank_window=(provenance.get("reranking") or {}).get("candidate_count", 0),
        dense_candidates=outcome.dense_candidate_count,
        lexical_candidates=outcome.lexical_candidate_count,
        fused_candidates=outcome.fused_candidate_count,
        stage_timings_ms=timing.get("stage_timings_ms", {}),
        branch_status=timing.get("branch_status", {}),
    )
    coverage = None
    if outcome.coverage is not None:
        coverage = RagCoverageResponse(
            documents_in_scope=outcome.coverage.documents_in_scope,
            documents_with_retrieved_evidence=outcome.coverage.documents_with_retrieved_evidence,
            retrieved_passage_count=outcome.coverage.retrieved_passage_count,
            coverage_ratio=outcome.coverage.coverage_ratio,
        )
    return RagRetrieveResponse(
        chunks=[
            RagRetrievedChunkResponse(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                content=chunk.content,
                score=chunk.score,
                filename=chunk.filename,
                chunk_index=chunk.chunk_index,
                page_number=chunk.page_number,
                rank=chunk.rank,
                used_in_answer=chunk.used_in_answer,
                index_revision_id=chunk.index_revision_id,
                source_span_ids=(chunk.metadata or {}).get("source_span_ids"),
                char_start=(chunk.metadata or {}).get("char_start"),
                char_end=(chunk.metadata or {}).get("char_end"),
                offset_coordinate_system=(chunk.metadata or {}).get("offset_coordinate_system"),
                offset_scope=(chunk.metadata or {}).get("offset_scope"),
                offset_scope_id=(chunk.metadata or {}).get("offset_scope_id"),
                source_spans=(chunk.metadata or {}).get("source_spans"),
                retrieval_sources=list(chunk.retrieval_sources),
            )
            for chunk in outcome.chunks
        ],
        degraded=outcome.degraded,
        degradation_reason=outcome.degradation_reason,
        no_matches=outcome.no_matches,
        injection_chunks_filtered=outcome.injection_chunks_filtered,
        intent=outcome.intent.value if outcome.intent else None,
        fusion_method=outcome.fusion_method,
        reranker=outcome.retrieval_provenance.get("reranker"),
        reranking_status=(outcome.retrieval_provenance.get("reranking") or {}).get("status"),
        coverage=coverage,
        retrieval_trace_id=outcome.retrieval_trace_id,
        index_revision_ids=outcome.index_revision_ids,
        diagnostics=diagnostics,
    )


MAX_PREVIEW_DOCUMENTS = 500


async def _cancel_on_disconnect(request: Request, operation) -> RagCompareResponse:
    task = asyncio.create_task(operation)
    try:
        while not task.done():
            done, _ = await asyncio.wait({task}, timeout=0.1)
            if not done and await request.is_disconnected():
                raise HTTPException(status_code=499, detail="Retrieval comparison cancelled")
        return await task
    finally:
        if not task.done():
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)


@router.post("/retrieve/compare", response_model=RagCompareResponse)
async def compare_retrieval(
    payload: RagCompareRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _rate_limit: None = Depends(enforce_ai_generation_rate_limit),
) -> RagCompareResponse:
    _require_rag_enabled()
    repo = RagReadService(db)
    scope = await repo.list_preview_revisions(
        user_id=current_user.id, project_id=payload.project_id, document_ids=payload.document_ids
    )
    if len(scope) > MAX_PREVIEW_DOCUMENTS:
        raise HTTPException(status_code=422, detail="Select a smaller document scope")
    if payload.document_ids and set(payload.document_ids) != {document for document, _ in scope}:
        raise HTTPException(status_code=404, detail="A selected document has no accessible index")
    document_ids = [document for document, _ in scope]
    revisions = list(dict.fromkeys(revision for _, revision in scope))
    baseline = RagConfig.from_settings()
    draft = payload.draft
    candidate = replace(
        baseline,
        score_threshold=baseline.score_threshold if draft.min_cosine is None else draft.min_cosine,
        dense_candidates=draft.candidate_pool or baseline.dense_candidates,
        lexical_candidates=draft.candidate_pool or baseline.lexical_candidates,
        rrf_k=draft.rrf_k or baseline.rrf_k,
        rerank_mode=baseline.rerank_mode if draft.reranker == "configured" else draft.reranker,
    )

    async def compare() -> RagCompareResponse:
        async def run(config: RagConfig, mode: str) -> RagRetrieveResponse:
            outcome = await RetrievalService(db, config).retrieve(
                RetrievalRequest(
                    query=payload.query,
                    user_id=current_user.id,
                    project_id=payload.project_id,
                    top_k=payload.top_k,
                    intent=payload.intent,
                    metadata=payload.metadata_filter,
                    filters={
                        "owner_scoped": True,
                        "document_ids": document_ids,
                        "index_revision_ids": revisions,
                        "retrieval_mode": mode,
                    },
                    preview=True,
                )
            )
            return _retrieval_response(outcome, config, preview=True)

        baseline_result = await run(baseline, payload.baseline_mode)
        candidate_result = await run(candidate, payload.retrieval_mode)
        if document_ids and scope != await repo.list_preview_revisions(
            user_id=current_user.id,
            project_id=payload.project_id,
            document_ids=document_ids,
        ):
            raise HTTPException(
                status_code=409,
                detail="Indexed documents changed. Run the comparison again",
            )
        return RagCompareResponse(
            baseline=baseline_result,
            candidate=candidate_result,
            document_count=len(document_ids),
            index_revision_ids=revisions,
        )

    try:
        return await _cancel_on_disconnect(request, compare())
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Retrieval comparison timed out") from exc


@router.post("/ask", response_model=RagAskResponse)
async def ask_rag(
    payload: RagAskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _rate_limit: None = Depends(enforce_ai_generation_rate_limit),
):
    _require_rag_enabled()
    service = RagPipelineService(db).answers
    try:
        result = await asyncio.wait_for(
            service.answer(
                payload.query,
                user=current_user,
                project_id=payload.project_id,
                run_id=payload.run_id,
                agent_id=payload.agent_id,
                document_ids=payload.document_ids,
                intent=payload.intent,
            ),
            timeout=settings.RAG_ASK_TIMEOUT_SECONDS,
        )
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="RAG answer timed out") from exc
    coverage = None
    if result.coverage is not None:
        coverage = RagCoverageResponse(
            documents_in_scope=result.coverage.documents_in_scope,
            documents_with_retrieved_evidence=result.coverage.documents_with_retrieved_evidence,
            retrieved_passage_count=result.coverage.retrieved_passage_count,
            coverage_ratio=result.coverage.coverage_ratio,
        )
    return RagAskResponse(
        query=result.query,
        answer=result.answer,
        citations=[
            RagCitationResponse(
                document_id=c.document_id,
                chunk_id=c.chunk_id,
                filename=c.filename,
                score=c.score,
                snippet=c.snippet,
                page_number=c.page_number,
                chunk_index=c.chunk_index,
                citation_number=c.citation_number,
                used_in_answer=c.used_in_answer,
                section_heading=c.section_heading,
                char_start=c.char_start,
                char_end=c.char_end,
                source_span_ids=c.source_span_ids,
                parent_context_id=c.parent_context_id,
                offset_coordinate_system=c.offset_coordinate_system,
                offset_scope=c.offset_scope,
                offset_scope_id=c.offset_scope_id,
                source_spans=c.source_spans,
                index_revision_id=c.index_revision_id,
            )
            for c in result.citations
        ],
        retrieved_chunk_ids=result.retrieved_chunk_ids,
        model_name=result.model_name,
        latency_ms=result.latency_ms,
        no_context_found=result.no_context_found,
        ai_run_id=result.ai_run_id,
        retrieval_degraded=result.retrieval_degraded,
        memory_degraded=result.memory_degraded,
        degradation_reason=result.degradation_reason,
        injection_chunks_filtered=result.injection_chunks_filtered,
        retrieval_trace_id=result.retrieval_trace_id,
        evidence_revision_hash=result.evidence_revision_hash,
        index_revision_ids=result.index_revision_ids,
        citation_validation_failed=result.citation_validation_failed,
        citation_validation_status=result.citation_validation_status,
        claims=[RagClaimResponse.model_validate(claim) for claim in result.claims],
        coverage=coverage,
    )


@router.get(
    "/documents/{document_id}/chunks/{chunk_id}/source",
    response_model=RagSourcePreviewResponse,
)
async def get_citation_source(
    document_id: str,
    chunk_id: str,
    response: Response,
    revision_id: str | None = Query(default=None, max_length=80),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RagSourcePreviewResponse:
    _require_rag_enabled()
    repo = RagReadService(db)
    rows = await repo.get_chunks_by_ids_for_scope(
        [chunk_id],
        user_id=current_user.id,
        project_id=None,
        document_ids=[document_id],
        current_only=True,
    )
    if not rows or rows[0].revision_id != revision_id or rows[0].chunk_index < 0:
        raise HTTPException(status_code=404, detail="Citation source is unavailable")
    row = rows[0]
    metadata = json.loads(row.metadata_json or "{}")
    pdf_url = None
    if revision_id and object_storage.is_configured:
        storage_key = await repo.get_current_pdf_source_key(
            document_id=document_id, revision_id=revision_id, user_id=current_user.id
        )
        if storage_key:
            with suppress(ObjectStorageError):
                pdf_url = await object_storage.presigned_download_url(storage_key, expires_in=60)
    response.headers["Cache-Control"] = "private, no-store"
    return RagSourcePreviewResponse(
        document_id=row.document_id,
        chunk_id=row.id,
        revision_id=row.revision_id,
        content=row.content,
        page_number=metadata.get("page_number"),
        section_heading=metadata.get("section_heading"),
        sheet_id=metadata.get("sheet_id"),
        table_row_start=metadata.get("table_row_start"),
        table_row_end=metadata.get("table_row_end"),
        source_spans=metadata.get("source_spans"),
        original_pdf_url=pdf_url,
    )


@router.get("/queries", response_model=PaginatedResponse[RagQueryResponse])
async def list_queries(
    pagination: PaginationParams = Depends(pagination_params),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_rag_enabled()
    repo = RagReadService(db)
    rows, total = await repo.list_queries_for_user(
        current_user.id,
        limit=pagination.limit,
        offset=pagination.offset,
    )
    return paginated_response(
        [RagQueryResponse.model_validate(row) for row in rows],
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.get("/jobs/{job_id}", response_model=RagIngestionJobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_rag_enabled()
    repo = RagReadService(db)
    job = await repo.get_ingestion_job(job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return RagIngestionJobResponse.model_validate(job)
