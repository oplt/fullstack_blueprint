from dataclasses import dataclass

from backend.modules.rag.metadata_filters import RetrievalMetadataFilter


@dataclass(frozen=True, slots=True)
class RetrievalScope:
    user_id: str
    project_id: str | None
    document_ids: tuple[str, ...] | None
    owner_scoped: bool = True
    exclude_parents: bool = False
    index_revision_ids: tuple[str, ...] | None = None
    metadata: RetrievalMetadataFilter | None = None
