from __future__ import annotations

from time import perf_counter

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.identity.models import User
from backend.modules.memory.config import MemoryConfig
from backend.modules.memory.domain import MemorySearchRequest
from backend.modules.memory.service import MemoryService
from backend.modules.projects.permissions import ProjectAccessPort, SqlAlchemyProjectAccessPort
from backend.modules.rag import metrics
from backend.modules.rag.citation_validation import CitationValidationService
from backend.modules.rag.citation_validation_context import CitationValidationContext
from backend.modules.rag.citations import CitationService
from backend.modules.rag.config import RagConfig
from backend.modules.rag.context import (
    RagContextBuilder,
    render_reference_data,
)
from backend.modules.rag.domain import RagAnswer, RetrievalOutcome, RetrievedChunk
from backend.modules.rag.enums import RetrievalIntent
from backend.modules.rag.evidence_access import evidence_is_current
from backend.modules.rag.generation_port import (
    RAG_MESSAGE_TOKEN_RESERVE,
    AiRunGenerationPort,
    GenerationPort,
)
from backend.modules.rag.repository import RagRepository
from backend.modules.rag.retrieval import RetrievalService
from backend.modules.rag.retrieval_request import RetrievalRequest
from backend.modules.rag.telemetry import traced, tracer


def _revision_by_document(chunks: list[RetrievedChunk]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    conflicts: set[str] = set()
    for chunk in chunks:
        revision = chunk.index_revision_id or (chunk.metadata or {}).get("revision_id")
        if not isinstance(revision, str) or not revision or chunk.document_id in conflicts:
            continue
        prior = mapping.get(chunk.document_id)
        if prior is None:
            mapping[chunk.document_id] = revision
        elif prior != revision:
            # Conflicting revisions for one document — omit so validation fails closed.
            mapping.pop(chunk.document_id, None)
            conflicts.add(chunk.document_id)
    return mapping


def _build_citation_validation_context(
    *,
    user_id: str,
    project_id: str | None,
    document_ids: list[str] | None,
    outcome: RetrievalOutcome,
    chunks: list[RetrievedChunk],
) -> CitationValidationContext | None:
    """Bind citation checks to frozen revision identity when retrieval carried one."""
    if not outcome.index_revision_ids and not outcome.evidence_revision_hash:
        return None
    return CitationValidationContext(
        user_id=user_id,
        project_id=project_id,
        evidence_revision_hash=outcome.evidence_revision_hash,
        index_revision_ids=list(outcome.index_revision_ids),
        revision_by_document=_revision_by_document(chunks),
        allowed_document_ids=document_ids,
        retrieval_trace_id=outcome.retrieval_trace_id,
    )


NO_CONTEXT_ANSWER = (
    "I could not find relevant document context for your question in the indexed documents."
)
CITATION_FAILURE_ANSWER = (
    "I could not generate a fully cited answer from the retrieved evidence. "
    "The retrieved evidence is shown separately below."
)

RETRIEVAL_FAILURE_ANSWER = "Document retrieval was unavailable. Try again."
STRUCTURED_REPAIR_INSTRUCTION = (
    "The previous response failed citation validation. Try again using complete verbatim "
    "excerpts from the content field, or return the insufficient-evidence response."
)


class RagAnswerService:
    def __init__(
        self,
        db: AsyncSession,
        config: RagConfig | None = None,
        *,
        retrieval: RetrievalService | None = None,
    ):
        self.db = db
        self.config = config or RagConfig.from_settings()
        self.retrieval = retrieval or RetrievalService(db, self.config)
        self.context_builder = RagContextBuilder(CitationService())
        self.citation_validator = CitationValidationService()
        self.repo = RagRepository(db)
        self.project_access: ProjectAccessPort = SqlAlchemyProjectAccessPort(db)
        self.memory = MemoryService(db)
        self.memory_config = MemoryConfig.from_settings()
        self.generation: GenerationPort = AiRunGenerationPort(db)

    @traced("rag.request")
    async def answer(
        self,
        query: str,
        *,
        user: User,
        project_id: str | None,
        run_id: str | None = None,
        agent_id: str | None = None,
        document_ids: list[str] | None = None,
        organization_id: str | None = None,
        intent: RetrievalIntent | str | None = None,
        owner_scoped: bool = True,
        conversation_id: str | None = None,
        include_memory: bool = True,
        commit: bool = True,
    ) -> RagAnswer:
        """Convenience wrapper: retrieve once, then answer_from_retrieval (I4)."""
        if not self.config.enabled:
            raise HTTPException(status_code=503, detail="RAG is disabled")

        if project_id:
            await self.project_access.ensure_project_access(user.id, project_id)

        filters: dict = {"owner_scoped": owner_scoped}
        if document_ids is not None:
            filters["document_ids"] = document_ids

        outcome = await self.retrieval.retrieve(
            RetrievalRequest(
                query=query,
                user_id=user.id,
                project_id=project_id,
                filters=filters,
                intent=intent,
                conversation_id=conversation_id,
                persist_trace=True,
            )
        )
        return await self.answer_from_retrieval(
            query,
            outcome=outcome,
            user=user,
            project_id=project_id,
            run_id=run_id,
            agent_id=agent_id,
            document_ids=document_ids,
            organization_id=organization_id,
            include_memory=include_memory,
            commit=commit,
        )

    @traced("rag.answer")
    async def answer_from_retrieval(
        self,
        query: str,
        *,
        outcome: RetrievalOutcome,
        user: User,
        project_id: str | None,
        run_id: str | None = None,
        agent_id: str | None = None,
        document_ids: list[str] | None = None,
        organization_id: str | None = None,
        include_memory: bool = True,
        conversation_context: str | None = None,
        resolved_retrieval_query: str | None = None,
        context_message_ids: list[str] | None = None,
        commit: bool = True,
    ) -> RagAnswer:
        """Generate from an existing retrieval outcome — never re-retrieves (I4)."""
        if not self.config.enabled:
            raise HTTPException(status_code=503, detail="RAG is disabled")

        started = perf_counter()
        user_id = user.id
        plan = await self.generation.prepare_rag_answer(user) if outcome.chunks else None
        memory_context, memory_degraded = "", False
        if plan and include_memory and self.memory_config.enabled:
            try:
                memory_context, _, memory_degraded = await self.memory.recall_for_prompt(
                    MemorySearchRequest(
                        user_id=user_id,
                        agent_id=agent_id or "default",
                        query=query,
                        run_id=run_id,
                        project_id=project_id,
                    )
                )
            except Exception:
                memory_degraded = True

        evidence_budget = 0
        supplementary = ""
        counter = plan.token_counter if plan else len
        if plan:
            evidence_budget = max(
                0,
                min(
                    self.config.max_context_tokens,
                    plan.context_window
                    - plan.max_output_tokens
                    - RAG_MESSAGE_TOKEN_RESERVE
                    - counter(plan.prompt.system_prompt)
                    - counter(query)
                    - counter(STRUCTURED_REPAIR_INSTRUCTION)
                    - 16,
                ),
            )
            extras = [
                render_reference_data(tag, value)
                for tag, value in (
                    ("untrusted_conversation", conversation_context),
                    ("untrusted_memory", memory_context),
                )
                if value
            ]
            proposed = "\n\n".join(extras)
            if counter(proposed) <= evidence_budget // 4:
                supplementary = proposed
                evidence_budget -= counter(supplementary)
            elif memory_context:
                memory_degraded = True

        with tracer.start_as_current_span(
            "rag.context_selection", record_exception=False, set_status_on_exception=False
        ):
            selection = self.context_builder.select_context_for_generation(
                outcome.chunks,
                max_tokens=evidence_budget,
                reserved_tokens=0,
                overlap_dedupe_threshold=getattr(
                    self.config, "context_overlap_dedupe_threshold", 0.8
                ),
                ordering_policy=getattr(self.config, "context_ordering_policy", "relevance"),
                token_counter=counter,
            )
        bounded_chunks = selection.chunks
        selection_provenance = {
            **selection.provenance(),
            "tokenizer": getattr(plan, "tokenizer", None),
            "evidence_budget": evidence_budget,
            "reserved_answer_tokens": plan.max_output_tokens if plan else 0,
        }
        outcome.retrieval_provenance["context_selection"] = selection_provenance
        if outcome.retrieval_trace_id:
            await self.repo.record_context_selection(
                outcome.retrieval_trace_id,
                user_id=user_id,
                selection=selection_provenance,
            )

        if not bounded_chunks:
            unavailable = outcome.degraded and not outcome.chunks
            answer = RETRIEVAL_FAILURE_ANSWER if unavailable else NO_CONTEXT_ANSWER
            if outcome.chunks:
                answer = "The retrieved evidence could not fit in the answer context."
            latency_ms = int((perf_counter() - started) * 1000)
            metrics.rag_answer_latency_ms.observe(latency_ms)
            await self._log_query(
                user_id=user_id,
                project_id=project_id,
                organization_id=organization_id,
                query=query,
                answer=answer,
                chunk_ids=[],
                model_name="none",
                latency_ms=latency_ms,
            )
            if commit:
                await self.db.commit()
            return RagAnswer(
                query=query,
                answer=answer,
                citations=[],
                retrieved_chunk_ids=[],
                model_name="none",
                latency_ms=latency_ms,
                no_context_found=not unavailable,
                ai_run_id=None,
                retrieval_degraded=outcome.degraded,
                memory_degraded=False,
                degradation_reason=outcome.degradation_reason,
                injection_chunks_filtered=outcome.injection_chunks_filtered,
                retrieval_trace_id=outcome.retrieval_trace_id,
                coverage=outcome.coverage,
                citation_validation_status="context_budget_exceeded"
                if outcome.chunks
                else ("retrieval_unavailable" if unavailable else "no_evidence"),
                evidence_revision_hash=outcome.evidence_revision_hash,
                resolved_retrieval_query=resolved_retrieval_query or query,
                context_message_ids=list(context_message_ids or []),
                index_revision_ids=list(outcome.index_revision_ids),
            )

        await self._ensure_current_evidence(bounded_chunks, user.id, project_id, document_ids)
        combined = "\n\n".join(
            filter(
                None,
                (
                    self.context_builder.build_document_context_block(bounded_chunks),
                    supplementary,
                ),
            )
        )
        chunk_ids = [c.chunk_id for c in bounded_chunks]

        ai_run = await self._generate(
            user,
            query=query,
            combined_context=combined,
            retrieved_chunk_ids=chunk_ids,
            retrieval_degraded=outcome.degraded,
            memory_degraded=memory_degraded,
            degradation_reason=outcome.degradation_reason,
            injection_chunks_filtered=outcome.injection_chunks_filtered,
            commit=commit,
            plan=plan,
        )
        await self._ensure_current_evidence(bounded_chunks, user.id, project_id, document_ids)

        citation_context = _build_citation_validation_context(
            user_id=user_id,
            project_id=project_id,
            document_ids=document_ids,
            outcome=outcome,
            chunks=bounded_chunks,
        )
        validated = self._validate_citations(
            raw_output=ai_run.output_text or "",
            retrieved_chunks=bounded_chunks,
            allowed_document_ids=document_ids,
            expected_index_revision_ids=outcome.index_revision_ids or None,
            context=citation_context,
        )

        # At most one bounded repair/retry for any citation-validation failure.
        if validated.citation_validation_failed:
            repair_context = f"{combined}\n\n{STRUCTURED_REPAIR_INSTRUCTION}"
            ai_run = await self._generate(
                user,
                query=query,
                combined_context=repair_context,
                retrieved_chunk_ids=chunk_ids,
                retrieval_degraded=outcome.degraded,
                memory_degraded=memory_degraded,
                degradation_reason=outcome.degradation_reason,
                injection_chunks_filtered=outcome.injection_chunks_filtered,
                commit=commit,
                plan=plan,
            )
            await self._ensure_current_evidence(bounded_chunks, user.id, project_id, document_ids)
            validated = self._validate_citations(
                raw_output=ai_run.output_text or "",
                retrieved_chunks=bounded_chunks,
                allowed_document_ids=document_ids,
                expected_index_revision_ids=outcome.index_revision_ids or None,
                context=citation_context,
            )

        if validated.citation_validation_failed:
            validated.answer = CITATION_FAILURE_ANSWER
            validated.claims = []
            for citation in validated.citations:
                citation.used_in_answer = False
                citation.citation_number = None

        latency_ms = int((perf_counter() - started) * 1000)
        metrics.rag_answer_latency_ms.observe(latency_ms)

        await self._log_query(
            user_id=user_id,
            project_id=project_id,
            organization_id=organization_id,
            query=query,
            answer=validated.answer,
            chunk_ids=chunk_ids,
            model_name=ai_run.model_name,
            latency_ms=latency_ms,
        )
        if commit:
            await self.db.commit()

        prompt_template_id = getattr(ai_run, "prompt_template_id", None)
        prompt_version_id = getattr(ai_run, "prompt_version_id", None)

        return RagAnswer(
            query=query,
            answer=validated.answer,
            citations=validated.citations,
            retrieved_chunk_ids=chunk_ids,
            model_name=ai_run.model_name,
            latency_ms=latency_ms,
            no_context_found=validated.no_evidence,
            ai_run_id=ai_run.id,
            retrieval_degraded=outcome.degraded,
            memory_degraded=memory_degraded,
            degradation_reason=outcome.degradation_reason,
            injection_chunks_filtered=outcome.injection_chunks_filtered,
            claims=validated.claims,
            retrieval_trace_id=outcome.retrieval_trace_id,
            coverage=outcome.coverage,
            citation_validation_failed=validated.citation_validation_failed,
            citation_validation_status=validated.citation_validation_status,
            evidence_revision_hash=outcome.evidence_revision_hash,
            prompt_template_id=prompt_template_id,
            prompt_version_id=prompt_version_id,
            resolved_retrieval_query=resolved_retrieval_query or query,
            context_message_ids=list(context_message_ids or []),
            index_revision_ids=list(outcome.index_revision_ids),
        )

    async def _ensure_current_evidence(
        self,
        chunks: list[RetrievedChunk],
        user_id: str,
        project_id: str | None,
        document_ids: list[str] | None,
    ) -> None:
        if not await evidence_is_current(
            self.repo, chunks, user_id=user_id, project_id=project_id, document_ids=document_ids
        ):
            raise HTTPException(
                status_code=409, detail="Document evidence changed. Run retrieval again."
            )

    @traced("rag.generation")
    async def _generate(self, *args, **kwargs):
        return await self.generation.run_rag_answer(*args, **kwargs)

    def _validate_citations(self, **kwargs):
        with tracer.start_as_current_span(
            "rag.citation_validation", record_exception=False, set_status_on_exception=False
        ):
            return self.citation_validator.validate(**kwargs)

    @traced("rag.answer.persistence")
    async def _log_query(
        self,
        *,
        user_id: str,
        project_id: str | None,
        organization_id: str | None,
        query: str,
        answer: str,
        chunk_ids: list[str],
        model_name: str,
        latency_ms: int,
    ) -> None:
        await self.repo.create_query_record(
            user_id=user_id,
            project_id=project_id,
            organization_id=organization_id,
            query=query,
            answer=answer,
            retrieved_chunk_ids=chunk_ids,
            model_name=model_name,
            latency_ms=latency_ms,
        )
