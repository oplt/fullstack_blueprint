from __future__ import annotations

from hashlib import sha256

from fastapi import HTTPException

from backend.modules.ai.models import AiRun
from backend.modules.ai.runs import AiRunService
from backend.modules.identity.models import User
from backend.modules.rag.contracts import RAG_MESSAGE_TOKEN_RESERVE, RagGenerationPlan
from backend.modules.rag.prompts import resolve_rag_answer_prompt


class RagAnswerRunService(AiRunService):
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
