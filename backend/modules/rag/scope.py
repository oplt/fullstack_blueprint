from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from sqlalchemy import or_, select

from backend.modules.projects.models import ProjectMember
from backend.modules.rag.domain import RetrievedChunk
from backend.modules.rag.filters import RetrievalMetadataFilter
from backend.modules.rag.models import RagDocument


@dataclass(frozen=True, slots=True)
class RetrievalScope:
    user_id: str
    project_id: str | None
    document_ids: tuple[str, ...] | None
    owner_scoped: bool = True
    exclude_parents: bool = False
    index_revision_ids: tuple[str, ...] | None = None
    metadata: RetrievalMetadataFilter | None = None


class EmptyDocumentAllowList(Exception):
    """Raised / used as a signal when an explicit empty allow-list short-circuits."""


def document_ids_is_empty_allow_list(document_ids: list[str] | None) -> bool:
    return document_ids is not None and len(document_ids) == 0


def should_apply_document_id_filter(document_ids: list[str] | None) -> bool:
    """True when SQL should include an IN (...) clause."""
    return document_ids is not None and len(document_ids) > 0


_IN_CLAUSE_BATCH = 500


def _owned_document_scope(user_id: str):
    accessible_projects = select(ProjectMember.project_id).where(ProjectMember.user_id == user_id)
    return (
        RagDocument.user_id == user_id,
        or_(
            RagDocument.project_id.is_(None),
            RagDocument.project_id.in_(accessible_projects),
        ),
    )


if TYPE_CHECKING:
    from backend.modules.rag.repository import RagRepository


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
