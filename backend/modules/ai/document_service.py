from __future__ import annotations

from collections.abc import Callable
from importlib import import_module
from typing import Any, Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import HTTPException, UploadFile

from backend.core.config import settings
from backend.core.pagination import DEFAULT_PAGE_LIMIT
from backend.modules.ai.service import AiBaseService
from backend.modules.identity.models import User
from backend.core.features import CAPABILITY_REGISTRY


class DocumentPort(Protocol):
    async def list_documents(
        self,
        user_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[Any], int]: ...

    async def get_document(self, user_id: str, document_id: str) -> Any: ...

    async def create_from_text(
        self,
        *,
        user_id: str,
        title: str,
        description: str | None,
        content: str,
        content_type: str,
        filename: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Any: ...

    async def create_from_upload(
        self,
        *,
        user_id: str,
        file: UploadFile,
        description: str | None,
    ) -> Any: ...

    async def retrieve_chunks(
        self,
        *,
        user_id: str,
        query: str,
        document_ids: list[str],
        top_k: int,
    ) -> list[dict[str, Any]]: ...


class PromptContextResult(Protocol):
    system_context: str | None
    retrieval_degraded: bool
    memory_degraded: bool
    degradation_reason: str | None
    injection_chunks_filtered: int

    @property
    def retrieved_chunk_ids(self) -> list[str]: ...


class RetrievalCapability(Protocol):
    @property
    def documents(self) -> DocumentPort: ...

    async def build(self, *, query: str, user_id: str, agent_id: str,
                    run_id: str | None, project_id: str | None,
                    document_ids: list[str] | None, top_k: int) -> PromptContextResult: ...


def configured_retrieval(db: AsyncSession) -> RetrievalCapability:
    target = CAPABILITY_REGISTRY.get("rag").ai_retrieval_factory
    if not settings.RAG_ENABLED or not target:
        raise HTTPException(status_code=503, detail="RAG is disabled")
    module, factory = target.split(":")
    return getattr(import_module(module), factory)(db)


class AiDocumentService(AiBaseService):
    """Legacy /ai/documents contract backed exclusively by RAG storage and ingestion."""

    def __init__(self, db: AsyncSession, *, retrieval_factory: Callable[[AsyncSession], RetrievalCapability] = configured_retrieval):
        super().__init__(db)
        self.retrieval_factory = retrieval_factory

    def retrieval_capability(self) -> RetrievalCapability:
        return self.retrieval_factory(self.db)

    async def list_documents(
        self,
        user: User,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ):
        self._require_rag_documents()
        return await self.retrieval_capability().documents.list_documents(
            user.id, limit=limit, offset=offset
        )

    async def get_document(self, user: User, document_id: str):
        self._require_rag_documents()
        return await self.retrieval_capability().documents.get_document(user.id, document_id)

    async def create_document_from_text(
        self,
        user: User,
        *,
        title: str,
        description: str | None,
        content: str,
        content_type: str,
        filename: str | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        if not content.strip():
            raise HTTPException(status_code=422, detail="Document content must not be empty")
        max_bytes = settings.RAG_MAX_FILE_BYTES
        if len(content.encode("utf-8")) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Document exceeds the maximum size of {max_bytes} bytes",
            )
        self._require_rag_documents()
        return await self.retrieval_capability().documents.create_from_text(
            user_id=user.id,
            title=title,
            description=description,
            content=content,
            content_type=content_type,
            filename=filename,
            metadata=metadata,
        )

    async def create_document_from_upload(
        self, user: User, file: UploadFile, description: str | None
    ):
        self._require_rag_documents()
        return await self.retrieval_capability().documents.create_from_upload(
            user_id=user.id,
            file=file,
            description=description,
        )

    async def retrieve_chunks(
        self,
        user: User,
        *,
        query: str,
        document_ids: list[str],
        top_k: int,
    ) -> list[dict[str, Any]]:
        if not settings.RAG_ENABLED:
            return []
        return await self.retrieval_capability().documents.retrieve_chunks(
            user_id=user.id,
            query=query,
            document_ids=document_ids,
            top_k=top_k,
        )

    @staticmethod
    def _require_rag_documents() -> None:
        if not settings.RAG_ENABLED:
            raise HTTPException(status_code=503, detail="RAG is disabled")
