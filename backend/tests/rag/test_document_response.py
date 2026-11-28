from datetime import UTC, datetime
from types import SimpleNamespace

from backend.modules.rag.api.routes import _document_to_response


def test_document_response_does_not_expose_storage_path() -> None:
    now = datetime.now(UTC)
    document = SimpleNamespace(
        id="doc-1",
        user_id="user-1",
        project_id=None,
        organization_id=None,
        filename="document.txt",
        original_filename="document.txt",
        content_type="text/plain",
        storage_path="private-bucket/internal/object-key",
        status="uploaded",
        source_type="upload",
        current_revision_id=None,
        metadata_json="{}",
        created_at=now,
        updated_at=now,
    )

    response = _document_to_response(document)

    assert response.storage_path is None
