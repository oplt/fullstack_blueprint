"""Recheck exact evidence against the user's currently published sources."""

from backend.modules.rag.domain.models import RetrievedChunk
from backend.modules.rag.infrastructure.repositories import RagRepository


async def evidence_is_current(
    repo: RagRepository,
    chunks: list[RetrievedChunk],
    *,
    user_id: str,
    project_id: str | None,
    document_ids: list[str] | None,
) -> bool:
    ids = {chunk.chunk_id for chunk in chunks}
    ids.update(
        chunk.parent_context_id
        for chunk in chunks
        if chunk.parent_context_id and chunk.context_content is not None
    )
    rows = await repo.get_chunks_by_ids_for_scope(
        sorted(ids),
        user_id=user_id,
        project_id=project_id,
        document_ids=document_ids,
        current_only=True,
    )
    by_id = {row.id: row for row in rows}
    for chunk in chunks:
        row = by_id.get(chunk.chunk_id)
        if (
            row is None
            or row.chunk_index < 0
            or row.document_id != chunk.document_id
            or row.revision_id != chunk.index_revision_id
            or row.content != chunk.content
            or (chunk.citation_content is not None and chunk.citation_content != row.content)
        ):
            return False
        if chunk.parent_context_id and chunk.context_content is not None:
            parent = by_id.get(chunk.parent_context_id)
            if (
                parent is None
                or parent.chunk_index >= 0
                or parent.document_id != row.document_id
                or parent.revision_id != row.revision_id
                or parent.content != chunk.context_content
                or row.parent_chunk_id != parent.id
            ):
                return False
    return True
