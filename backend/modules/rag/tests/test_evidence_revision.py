"""Tests for deterministic indexed-evidence revision identity."""

from types import SimpleNamespace

from backend.modules.rag.application.evidence_revision import (
    build_evidence_revision_hash,
    chunk_revision_identity,
)


def _config(**overrides):
    values = {
        "parser_version": "parser-v1",
        "chunker_version": "chunker-v1",
        "embedding_provider": "local",
        "embedding_model": "model-v1",
        "embedding_dimensions": 1536,
        "retrieval_algorithm_version": "retrieval-v1",
        "index_version": "index-v1",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def _revision(content_hash: str = "content-v1") -> list[dict]:
    return [
        {
            "rag_document_id": "doc-1",
            "content_fingerprint": "file-v1",
            "chunks": [
                {
                    "chunk_id": "chunk-1",
                    "chunk_index": 0,
                    "content_hash": content_hash,
                }
            ],
        }
    ]


def test_evidence_revision_hash_is_order_independent():
    first = _revision() + [{"rag_document_id": "doc-2", "content_fingerprint": "file-v2"}]
    second = list(reversed(first))

    assert build_evidence_revision_hash(
        project_id="project-1",
        document_revisions=first,
        config=_config(),
    ) == build_evidence_revision_hash(
        project_id="project-1",
        document_revisions=second,
        config=_config(),
    )


def test_evidence_revision_hash_changes_for_content_and_index_inputs():
    baseline = build_evidence_revision_hash(
        project_id="project-1",
        document_revisions=_revision(),
        config=_config(),
    )
    content_changed = build_evidence_revision_hash(
        project_id="project-1",
        document_revisions=_revision("content-v2"),
        config=_config(),
    )
    index_changed = build_evidence_revision_hash(
        project_id="project-1",
        document_revisions=_revision(),
        config=_config(index_version="index-v2"),
    )

    assert baseline != content_changed
    assert baseline != index_changed


def test_evidence_revision_hash_changes_when_content_hash_is_stale():
    first = SimpleNamespace(id="chunk-1", chunk_index=0, content="first", content_hash="same")
    second = SimpleNamespace(id="chunk-1", chunk_index=0, content="second", content_hash="same")
    first_revision = {
        "rag_document_id": "doc-1",
        "chunks": [chunk_revision_identity(first)],
    }
    second_revision = {
        "rag_document_id": "doc-1",
        "chunks": [chunk_revision_identity(second)],
    }

    assert build_evidence_revision_hash(
        project_id="project-1",
        document_revisions=[first_revision],
        config=_config(),
    ) != build_evidence_revision_hash(
        project_id="project-1",
        document_revisions=[second_revision],
        config=_config(),
    )
