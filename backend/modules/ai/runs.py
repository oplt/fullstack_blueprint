from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha256
from time import perf_counter
from types import SimpleNamespace
from typing import Any

from fastapi import HTTPException

from backend.core.pagination import DEFAULT_PAGE_LIMIT
from backend.modules.rag.generation_port import RAG_MESSAGE_TOKEN_RESERVE, RagGenerationPlan
from backend.modules.ai import metrics
from backend.modules.rag.prompts import resolve_rag_answer_prompt
from backend.modules.ai.contracts import AiMessage, AiMessageRole, AiProviderRequest
from backend.modules.ai.document_service import AiDocumentService
from backend.modules.ai.errors import AiErrorKind, AiProviderError
from backend.modules.ai.models import AiPromptVersion, AiRun
from backend.modules.ai.prompts import AiPromptService, _render_template
from backend.modules.identity.models import User
from backend.modules.rag.prompt_context_service import PromptContextService
from backend.modules.rag.context import (
    RAG_UNTRUSTED_CONTEXT_RULE,
    render_reference_data,
)
from backend.modules.rag.config import RagConfig


class AiRunService(AiPromptService, AiDocumentService):
    async def run_prompt(
        self,
        user: User,
        *,
        prompt_template_key: str | None,
        prompt_version_id: str | None,
        variables: dict[str, Any],
        retrieval_query: str | None,
        document_ids: list[str],
        top_k: int,
        review_required: bool,
        evaluation_dataset_id: str | None = None,
        evaluation_case_id: str | None = None,
        additional_system_context: str | None = None,
        retrieved_chunk_ids: list[str] | None = None,
        retrieval_degraded: bool = False,
        memory_degraded: bool = False,
        degradation_reason: str | None = None,
        injection_chunks_filtered: int = 0,
        agent_id: str | None = None,
        agent_run_id: str | None = None,
        commit: bool = True,
    ):
        template, version = await self._resolve_prompt_version(
            user,
            prompt_template_key=prompt_template_key,
            prompt_version_id=prompt_version_id,
        )
        matches: list[dict[str, Any]] = []
        resolved_chunk_ids = list(retrieved_chunk_ids or [])
        rag_config = RagConfig.from_settings()
        if retrieval_query and rag_config.enabled:
            context = await PromptContextService(self.db, rag_config=rag_config).build(
                query=retrieval_query,
                user_id=user.id,
                agent_id="default",
                run_id=None,
                project_id=None,
                document_ids=document_ids or None,
                top_k=top_k,
            )
            resolved_chunk_ids = context.retrieved_chunk_ids
            retrieval_degraded = context.retrieval_degraded
            memory_degraded = context.memory_degraded
            degradation_reason = context.degradation_reason
            injection_chunks_filtered = context.injection_chunks_filtered
            additional_system_context = self._merge_system_context(
                additional_system_context,
                context.system_context,
            )
        elif retrieval_query:
            matches = await self.retrieve_chunks(
                user,
                query=retrieval_query,
                document_ids=document_ids,
                top_k=top_k,
            )
            if matches:
                additional_system_context = self._merge_system_context(
                    additional_system_context,
                    render_reference_data(
                        "untrusted_documents",
                        [
                            {"chunk_id": item["chunk_id"], "content": item["content"]}
                            for item in matches
                        ],
                    ),
                )
            resolved_chunk_ids = [item["chunk_id"] for item in matches]

        variables = dict(variables)
        supplied_context = variables.pop("retrieval_context", None)
        if isinstance(supplied_context, str) and supplied_context:
            additional_system_context = self._merge_system_context(
                additional_system_context,
                render_reference_data("untrusted_reference", supplied_context),
            )
        template_variables = {**variables, "retrieval_context": ""}
        rendered_system_prompt = _render_template(version.system_prompt, template_variables)
        stored_user_prompt = _render_template(version.user_prompt_template, template_variables)
        rendered_user_prompt = stored_user_prompt
        if additional_system_context:
            rendered_system_prompt = (
                f"{rendered_system_prompt.rstrip()}\n\n{RAG_UNTRUSTED_CONTEXT_RULE}"
            )
            rendered_user_prompt = f"{stored_user_prompt}\n\n{additional_system_context}"
        run = await self.repo.create_run(
            user_id=user.id,
            prompt_template_id=template.id if template else None,
            prompt_version_id=version.id,
            evaluation_dataset_id=evaluation_dataset_id,
            evaluation_case_id=evaluation_case_id,
            agent_id=agent_id,
            agent_run_id=agent_run_id,
            provider_key=version.provider_key,
            model_name=version.model_name,
            status="running",
            response_format=version.response_format,
            variables_json=variables,
            retrieval_query=retrieval_query,
            retrieved_chunk_ids_json=resolved_chunk_ids,
            retrieval_degraded=retrieval_degraded,
            memory_degraded=memory_degraded,
            degradation_reason=degradation_reason,
            injection_chunks_filtered=injection_chunks_filtered,
            input_messages_json=[
                {"role": "system", "content": rendered_system_prompt},
                {"role": "user", "content": stored_user_prompt},
            ],
            tenant_id=user.id,
            data_region=None,
            input_hash=sha256(stored_user_prompt.encode()).hexdigest(),
            routing_policy_json={"source": "prompt_version", "deterministic": True},
            review_status="pending" if review_required else "not_requested",
        )

        await self.db.flush()
        return await self._finalize_run_generation(
            user=user,
            run=run,
            version=version,
            rendered_system_prompt=rendered_system_prompt,
            rendered_user_prompt=rendered_user_prompt,
            review_required=review_required,
            commit=commit,
        )

    @staticmethod
    def _merge_system_context(*blocks: str | None) -> str | None:
        merged = [block.strip() for block in blocks if block and block.strip()]
        return "\n\n".join(merged) or None

    async def run_rag_answer(
        self,
        user: User,
        *,
        query: str,
        combined_context: str,
        retrieved_chunk_ids: list[str],
        review_required: bool = False,
        retrieval_degraded: bool = False,
        memory_degraded: bool = False,
        degradation_reason: str | None = None,
        injection_chunks_filtered: int = 0,
        commit: bool = True,
        plan: RagGenerationPlan | None = None,
        output_capture: list[str | None] | None = None,
    ) -> AiRun:
        prompt_spec = plan.prompt if plan else await resolve_rag_answer_prompt(self.repo, user)

        reference_context = combined_context.strip()
        rendered_system_prompt = prompt_spec.system_prompt
        rendered_user_prompt = f"{query}\n\n{reference_context}" if reference_context else query
        version = prompt_spec.execution_version
        if plan is not None:
            version.max_output_tokens = plan.max_output_tokens
            if (
                plan.token_counter(rendered_system_prompt)
                + plan.token_counter(rendered_user_prompt)
                + plan.max_output_tokens
                + RAG_MESSAGE_TOKEN_RESERVE
                > plan.context_window
            ):
                raise HTTPException(
                    status_code=422, detail="RAG answer prompt exceeds the model context"
                )

        run = await self.repo.create_run(
            user_id=user.id,
            prompt_template_id=prompt_spec.template_id,
            prompt_version_id=prompt_spec.version_id,
            provider_key=prompt_spec.provider_key,
            model_name=prompt_spec.model_name,
            status="running",
            response_format=prompt_spec.response_format,
            variables_json={"query": query},
            retrieval_query=query,
            retrieved_chunk_ids_json=retrieved_chunk_ids,
            retrieval_degraded=retrieval_degraded,
            memory_degraded=memory_degraded,
            degradation_reason=degradation_reason,
            injection_chunks_filtered=injection_chunks_filtered,
            input_messages_json=[
                {"role": "system", "content": rendered_system_prompt},
                {"role": "user", "content": query},
            ],
            tenant_id=user.id,
            data_region=None,
            input_hash=sha256(query.encode()).hexdigest(),
            routing_policy_json={"source": "rag_prompt", "deterministic": True},
            review_status="pending" if review_required else "not_requested",
        )
        await self.db.flush()
        return await self._finalize_run_generation(
            user=user,
            run=run,
            version=version,
            rendered_system_prompt=rendered_system_prompt,
            rendered_user_prompt=rendered_user_prompt,
            review_required=review_required,
            commit=commit,
            output_capture=output_capture if output_capture is not None else [],
        )

    async def _finalize_run_generation(
        self,
        *,
        user: User,
        run: AiRun,
        version: AiPromptVersion | SimpleNamespace,
        rendered_system_prompt: str,
        rendered_user_prompt: str,
        review_required: bool,
        commit: bool,
        output_capture: list[str | None] | None = None,
    ) -> AiRun:
        started = perf_counter()
        try:
            result = await self.gateway.generate(
                AiProviderRequest(
                    model=version.model_name,
                    messages=[
                        AiMessage(role=AiMessageRole.SYSTEM, content=rendered_system_prompt),
                        AiMessage(role=AiMessageRole.USER, content=rendered_user_prompt),
                    ],
                    response_format=version.response_format,
                    temperature=version.temperature,
                    max_output_tokens=getattr(version, "max_output_tokens", None),
                    metadata={"provider_key": run.provider_key, "run_id": run.id},
                )
            )
            latency_ms = int((perf_counter() - started) * 1000)
            metrics.ai_run_latency_ms.observe(latency_ms)
            run.status = "completed"
            if output_capture is not None:
                output_capture.append(result.output_text)
            else:
                run.output_text = result.output_text
                run.output_json = result.output_json
            run.latency_ms = latency_ms
            run.input_tokens = result.usage.input_tokens
            run.output_tokens = result.usage.output_tokens
            run.total_tokens = result.usage.total_tokens
            run.provider_request_id = result.provider_request_id
            run.estimated_cost_micros = round(
                (
                    result.usage.input_tokens * version.input_cost_per_million
                    + result.usage.output_tokens * version.output_cost_per_million
                )
                / 1_000_000
            )
            metrics.ai_cost_micros_total.inc(run.estimated_cost_micros)
            run.completed_at = datetime.now(UTC)
            await self.repo.create_usage_record(
                run_id=run.id,
                user_id=user.id,
                tenant_id=getattr(run, "tenant_id", None) or user.id,
                provider_key=run.provider_key,
                model_name=run.model_name,
                input_tokens=result.usage.input_tokens,
                output_tokens=result.usage.output_tokens,
                cost_micros=run.estimated_cost_micros,
            )
        except AiProviderError as exc:
            metrics.ai_run_failed_total.inc()
            run.status = "cancelled" if exc.kind == AiErrorKind.CANCELLED else "failed"
            run.error_message = str(exc)
            run.provider_request_id = exc.provider_request_id
            run.retry_count = exc.attempt
            run.completed_at = datetime.now(UTC)
            if commit:
                await self.db.commit()
            status_code = {
                AiErrorKind.CONFIGURATION: 422,
                AiErrorKind.AUTHENTICATION: 502,
                AiErrorKind.INVALID_REQUEST: 422,
                AiErrorKind.STRUCTURED_OUTPUT: 502,
                AiErrorKind.RATE_LIMIT: 429,
                AiErrorKind.TIMEOUT: 504,
                AiErrorKind.CANCELLED: 499,
                AiErrorKind.CIRCUIT_OPEN: 503,
                AiErrorKind.BUDGET_EXCEEDED: 429,
            }.get(exc.kind, 502)
            raise HTTPException(status_code=status_code, detail=str(exc)) from exc
        except HTTPException as exc:
            metrics.ai_run_failed_total.inc()
            run.status = "failed"
            run.error_message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
            run.completed_at = datetime.now(UTC)
            if commit:
                await self.db.commit()
            raise
        except Exception as exc:
            metrics.ai_run_failed_total.inc()
            run.status = "failed"
            run.error_message = "AI provider execution failed"
            run.completed_at = datetime.now(UTC)
            if commit:
                await self.db.commit()
            raise HTTPException(status_code=502, detail="AI provider execution failed") from exc

        if review_required:
            await self.repo.create_review(
                run_id=run.id,
                requested_by_user_id=user.id,
                status="pending",
            )

        if commit:
            await self.db.commit()
            await self.db.refresh(run)
        return run

    async def list_runs(
        self,
        user: User,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ):
        return await self.repo.list_runs_for_user(user.id, limit=limit, offset=offset)
