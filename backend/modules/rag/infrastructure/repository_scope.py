"""Shared tenant and batching rules for RAG persistence queries."""

from sqlalchemy import or_, select

from backend.modules.projects.models import ProjectMember
from backend.modules.rag.infrastructure.models import RagDocument

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
