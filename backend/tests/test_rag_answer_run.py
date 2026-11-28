import unittest
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock, MagicMock, patch

from backend.modules.ai.contracts import AiProviderRequest, AiProviderResponse, AiUsage
from backend.modules.ai.models import AiRun
from backend.modules.ai.runs import AiRunService
from backend.modules.identity.models import User
from backend.modules.rag.generation import RagAnswerRunService
from backend.modules.rag.prompts import (
    DEFAULT_RAG_ANSWER_SYSTEM_PROMPT,
    RAG_STRUCTURED_OUTPUT_CONTRACT,
    resolve_rag_answer_prompt,
)


class RagAnswerPromptTest(unittest.IsolatedAsyncioTestCase):
    async def test_resolve_rag_answer_prompt_falls_back_to_defaults(self):
        repo = MagicMock()
        repo.get_prompt_template_by_key_for_user = AsyncMock(return_value=None)
        user = User(id="user-1", email="a@example.com", password_hash="x")

        spec = await resolve_rag_answer_prompt(repo, user)

        self.assertIsNone(spec.template_id)
        self.assertEqual(
            spec.system_prompt,
            f"{RAG_STRUCTURED_OUTPUT_CONTRACT}\n\n{DEFAULT_RAG_ANSWER_SYSTEM_PROMPT}",
        )

    async def test_resolve_rag_answer_prompt_selects_active_version_from_paginated_result(self):
        repo = MagicMock()
        repo.get_prompt_template_by_key_for_user = AsyncMock(
            return_value=SimpleNamespace(id="tpl-1", active_version_id="ver-active")
        )
        active = SimpleNamespace(
            id="ver-active",
            provider_key="openai",
            model_name="gpt-test",
            system_prompt="Custom RAG prompt",
            response_format="text",
            temperature=0.1,
            input_cost_per_million=1,
            output_cost_per_million=2,
            is_published=True,
        )
        repo.list_prompt_versions = AsyncMock(return_value=([active], 1))
        user = User(id="user-1", email="a@example.com", password_hash="x")

        with patch(
            "backend.modules.rag.prompts.settings.RAG_ASK_PROMPT_TEMPLATE_KEY",
            "rag-answer",
        ):
            spec = await resolve_rag_answer_prompt(repo, user)

        repo.list_prompt_versions.assert_awaited_once_with("tpl-1", limit=200, offset=0)
        self.assertEqual(spec.template_id, "tpl-1")
        self.assertEqual(spec.version_id, "ver-active")
        self.assertEqual(
            spec.system_prompt,
            f"{RAG_STRUCTURED_OUTPUT_CONTRACT}\n\nCustom RAG prompt",
        )
        self.assertEqual(spec.response_format, "json")


class AiRunServiceRagAnswerTest(unittest.IsolatedAsyncioTestCase):
    async def test_shared_retrieved_context_stays_out_of_system_and_stored_prompts(self):
        service = AiRunService(AsyncMock())
        service._resolve_prompt_version = AsyncMock(
            return_value=(
                None,
                SimpleNamespace(
                    id="prompt",
                    provider_key="local",
                    model_name="model",
                    response_format="text",
                    system_prompt="System policy. {{retrieval_context}}",
                    user_prompt_template="{{query}}",
                ),
            )
        )
        service.repo = MagicMock()
        service.repo.create_run = AsyncMock(return_value=SimpleNamespace(id="run-1"))
        service._finalize_run_generation = AsyncMock()
        user = User(id="user-1", email="a@example.com", password_hash="x")

        await service.run_prompt(
            user,
            prompt_template_key=None,
            prompt_version_id="prompt",
            variables={
                "query": "Find the limit",
                "retrieval_context": "reserved variable evidence",
            },
            retrieval_query=None,
            document_ids=[],
            top_k=5,
            review_required=False,
            additional_system_context="<untrusted_documents>private source</untrusted_documents>",
        )

        generated = service._finalize_run_generation.await_args.kwargs
        stored = service.repo.create_run.await_args.kwargs
        for marker in ("private source", "reserved variable evidence"):
            self.assertIn(marker, generated["rendered_user_prompt"])
            self.assertNotIn(marker, generated["rendered_system_prompt"])
            self.assertNotIn(marker, str(stored["input_messages_json"]))
            self.assertNotIn(marker, str(stored["variables_json"]))

    @patch("backend.modules.rag.generation.resolve_rag_answer_prompt")
    async def test_run_rag_answer_creates_run_with_retrieved_chunk_ids(self, resolve_prompt):
        db = AsyncMock()
        service = RagAnswerRunService(db)
        service.repo = MagicMock()
        service.repo.create_run = AsyncMock(
            return_value=SimpleNamespace(id="run-1", provider_key="local")
        )
        service._finalize_run_generation = AsyncMock(
            return_value=SimpleNamespace(
                id="run-1",
                output_text="Answer text",
                model_name="local-heuristic",
            )
        )
        resolve_prompt.return_value = SimpleNamespace(
            template_id=None,
            version_id=None,
            provider_key="local",
            model_name="local-heuristic",
            system_prompt=DEFAULT_RAG_ANSWER_SYSTEM_PROMPT,
            response_format="text",
            execution_version=SimpleNamespace(
                model_name="local-heuristic",
                response_format="text",
                temperature=0.2,
                input_cost_per_million=0,
                output_cost_per_million=0,
            ),
        )
        user = User(id="user-1", email="a@example.com", password_hash="x")

        run = await service.run_rag_answer(
            user,
            query="What is Postgres?",
            combined_context="<untrusted_documents>private source</untrusted_documents>",
            retrieved_chunk_ids=["chunk-1"],
            retrieval_degraded=True,
            memory_degraded=True,
            degradation_reason="provider_partial",
            injection_chunks_filtered=2,
        )

        self.assertEqual(run.id, "run-1")
        create_kwargs = service.repo.create_run.await_args.kwargs
        self.assertEqual(create_kwargs["retrieved_chunk_ids_json"], ["chunk-1"])
        self.assertEqual(create_kwargs["retrieval_query"], "What is Postgres?")
        self.assertTrue(create_kwargs["retrieval_degraded"])
        self.assertTrue(create_kwargs["memory_degraded"])
        self.assertEqual(create_kwargs["degradation_reason"], "provider_partial")
        self.assertEqual(create_kwargs["injection_chunks_filtered"], 2)
        self.assertEqual(create_kwargs["input_messages_json"][0]["role"], "system")
        self.assertIn("What is Postgres?", create_kwargs["input_messages_json"][1]["content"])
        self.assertNotIn("User question:", create_kwargs["input_messages_json"][1]["content"])
        self.assertNotIn("private source", str(create_kwargs["input_messages_json"]))
        service._finalize_run_generation.assert_awaited_once()
        generation = service._finalize_run_generation.await_args.kwargs
        self.assertIn("private source", generation["rendered_user_prompt"])
        self.assertNotIn("private source", generation["rendered_system_prompt"])
        self.assertEqual(generation["output_capture"], [])


class AiRunProviderContractTest(unittest.IsolatedAsyncioTestCase):
    async def test_generation_uses_canonical_request_and_usage_contract(self):
        service = AiRunService(AsyncMock())
        service.repo = MagicMock()
        service.repo.create_usage_record = AsyncMock()
        provider = MagicMock()
        provider.generate_contract = AsyncMock(
            return_value=AiProviderResponse(
                provider_key="local",
                model="model-v1",
                output_text="answer",
                usage=AiUsage(input_tokens=1_000_000, output_tokens=500_000),
                provider_request_id="request-123",
            )
        )
        service.providers = MagicMock()
        service.providers.get.return_value = provider
        run = cast(
            AiRun,
            SimpleNamespace(id="run-1", provider_key="local", model_name="model-v1"),
        )
        version = SimpleNamespace(
            model_name="model-v1",
            response_format="text",
            temperature=0.2,
            input_cost_per_million=1,
            output_cost_per_million=2,
        )
        user = User(id="user-1", email="a@example.com", password_hash="x")

        await service._finalize_run_generation(
            user=user,
            run=run,
            version=version,
            rendered_system_prompt="system",
            rendered_user_prompt="question",
            review_required=False,
            commit=False,
        )

        request = provider.generate_contract.await_args.args[0]
        self.assertIsInstance(request, AiProviderRequest)
        self.assertEqual(request.system_prompt, "system")
        self.assertEqual(request.user_prompt, "question")
        self.assertEqual(run.status, "completed")
        self.assertEqual(run.total_tokens, 1_500_000)
        self.assertEqual(run.provider_request_id, "request-123")
        self.assertEqual(run.estimated_cost_micros, 2)
