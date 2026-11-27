from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from backend.modules.rag.domain.enums import RetrievalIntent
from backend.modules.rag.domain.metadata_filters import RetrievalMetadataFilter


@dataclass(frozen=True, slots=True)
class RetrievalRequest:
    query: str
    user_id: str
    project_id: str | None
    top_k: int | None = None
    filters: Mapping[str, Any] | None = None
    intent: RetrievalIntent | str | None = None
    conversation_id: str | None = None
    persist_trace: bool = False
    evidence_revision_hash: str | None = None
    metadata: RetrievalMetadataFilter | None = None
    preview: bool = False
