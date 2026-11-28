from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import asdict, dataclass, replace
from typing import Any

from backend.modules.rag.domain import ParsedBlock, ParsedDocument, RetrievedChunk


@dataclass(frozen=True, slots=True)
class SourceCoordinate:
    scope_type: str
    scope_id: str
    coordinate_system: str
    start: int
    end: int
    source_span_id: str

    def to_dict(self) -> dict[str, str | int]:
        return asdict(self)


BLOCK_MODEL_VERSION = "source-block-v1"
BBOX_COORDINATE_COUNT = 4


@dataclass(frozen=True, slots=True)
class ParserIdentity:
    source_document_hash: str
    document_id: str | None
    revision_id: str | None


def _stable_block_id(
    *, source_hash: str, parser_version: str, ordinal: int, source_ref: str, text: str
) -> str:
    identity = "\0".join((source_hash, parser_version, str(ordinal), source_ref, text))
    return f"block-{hashlib.sha256(identity.encode('utf-8')).hexdigest()[:32]}"


def _bbox(value: Any) -> tuple[float, float, float, float] | None:
    if isinstance(value, dict):
        try:
            return tuple(float(value[key]) for key in ("l", "t", "r", "b"))  # type: ignore[return-value]
        except (KeyError, TypeError, ValueError):
            return None
    if isinstance(value, (list, tuple)) and len(value) == BBOX_COORDINATE_COUNT:
        try:
            return tuple(float(coordinate) for coordinate in value)  # type: ignore[return-value]
        except (TypeError, ValueError):
            return None
    return None


def _table_data(metadata: dict[str, Any]) -> tuple[tuple[str, ...], ...]:
    table = metadata.get("table")
    rows = table.get("rows") if isinstance(table, dict) else metadata.get("rows")
    if not isinstance(rows, list):
        return ()
    return tuple(
        tuple(str(cell) if cell is not None else "" for cell in row)
        for row in rows
        if isinstance(row, (list, tuple))
    )


def normalize_parsed_documents(
    documents: list[ParsedDocument],
    *,
    source_document_hash: str,
    document_id: str | None = None,
    revision_id: str | None = None,
) -> list[ParsedDocument]:
    """Attach common block provenance while retaining parser document boundaries."""
    identity = ParserIdentity(source_document_hash, document_id, revision_id)
    normalized: list[ParsedDocument] = []
    ordinal = 0
    for document in documents:
        metadata = document.metadata or {}
        parser_name = str(metadata.get("parser") or "baseline")
        parser_version = str(metadata.get("parser_version") or parser_name)
        blocks = document.source_blocks or _blocks_from_metadata(
            document,
            identity=identity,
            parser_name=parser_name,
            parser_version=parser_version,
            first_ordinal=ordinal,
        )
        ordinal += max(1, len(blocks))
        bound = [
            replace(
                block,
                document_id=identity.document_id or block.document_id,
                revision_id=identity.revision_id or block.revision_id,
                source_document_hash=identity.source_document_hash,
            )
            for block in blocks
        ]
        normalized_metadata = {**metadata, "normalized_block_model": BLOCK_MODEL_VERSION}
        normalized.append(replace(document, metadata=normalized_metadata, source_blocks=bound))
    return normalized


def _blocks_from_metadata(
    document: ParsedDocument,
    *,
    identity: ParserIdentity,
    parser_name: str,
    parser_version: str,
    first_ordinal: int,
) -> list[ParsedBlock]:
    metadata = document.metadata or {}
    source_items = metadata.get("blocks")
    if not isinstance(source_items, list) or not source_items:
        source_items = [None]

    output: list[ParsedBlock] = []
    cursor = 0
    for offset, raw_item in enumerate(source_items):
        item = raw_item if isinstance(raw_item, dict) else {}
        text = str(item.get("text") or "")
        start = document.content.find(text, cursor) if text else 0
        aligned = start >= 0
        if not aligned:
            start = 0
        end = start + len(text) if text else len(document.content)
        cursor = max(cursor, end)

        page = document.page_number or metadata.get("page_number")
        table_rows = _table_data(metadata)
        kind = str(metadata.get("parsed_block_type") or "paragraph")
        if metadata.get("format") == "csv":
            kind = "table_row"
        table = metadata.get("table")
        table_bbox = table.get("bbox") if isinstance(table, dict) else None
        bbox_value = item.get("bbox") or metadata.get("bbox") or table_bbox
        bbox = _bbox(bbox_value)
        parser_block_id = item.get("block_id") or (
            table.get("block_id") if isinstance(table, dict) else None
        )
        block_id = (
            str(parser_block_id)
            if parser_block_id
            else _stable_block_id(
                source_hash=identity.source_document_hash,
                parser_version=parser_version,
                ordinal=first_ordinal + offset,
                source_ref=str(metadata.get("row_number") or offset),
                text=text or document.content,
            )
        )
        source_span = {
            "scope_type": "page" if page is not None else "parsed_document",
            "scope_id": (
                f"{identity.document_id or identity.source_document_hash}:"
                f"{page or first_ordinal + offset}"
            ),
            "coordinate_system": "parsed_document_codepoints_zero_based_end_exclusive",
            "start": start,
            "end": end,
            "aligned": aligned,
        }
        if isinstance(metadata.get("source_span"), dict):
            source_span["parser_span"] = dict(metadata["source_span"])
        table_headers = (
            metadata.get("table_headers")
            or metadata.get("headers")
            or (table.get("headers") if isinstance(table, dict) else None)
        )
        if not isinstance(table_headers, list):
            table_headers = []
        raw_section_path = metadata.get("section_path")
        section_path = (
            tuple(str(section) for section in raw_section_path if section)
            if isinstance(raw_section_path, (list, tuple))
            else ((str(metadata["section_heading"]),) if metadata.get("section_heading") else ())
        )
        raw_cells = table.get("cells") if isinstance(table, dict) else None
        if raw_cells is None:
            raw_cells = [
                {"row": row_index, "column": column_index}
                for row_index, row in enumerate(table_rows)
                for column_index, _cell in enumerate(row)
            ]
        output.append(
            ParsedBlock(
                block_id=block_id,
                kind=kind,
                reading_order=int(item.get("reading_order", offset)),
                source_span=source_span,
                document_id=identity.document_id,
                revision_id=identity.revision_id,
                source_document_hash=identity.source_document_hash,
                page_start=page if isinstance(page, int) else None,
                page_end=page if isinstance(page, int) else None,
                bbox=bbox,
                bbox_coordinate_system=(
                    "page_points_top_left"
                    if bbox and parser_name.startswith("pymupdf")
                    else ("parser_page_coordinates" if bbox else None)
                ),
                section_path=section_path,
                parser_name=parser_name,
                parser_version=parser_version,
                table_headers=tuple(str(cell) for cell in table_headers),
                table_rows=table_rows,
                table_cells=tuple(cell for cell in raw_cells if isinstance(cell, dict)),
                media_reference=(
                    str(metadata["media_reference"]) if metadata.get("media_reference") else None
                ),
            )
        )
    return output


class StaleEvidenceRevisionError(ValueError):
    """Retrieved chunks do not match the frozen revision allow-list."""

    code = "stale_evidence_revision"


def assert_chunks_match_revision_allow_list(
    chunks: Iterable[RetrievedChunk],
    index_revision_ids: list[str] | None,
) -> None:
    """Fail closed when frozen retrieval returns chunks outside its revision set."""
    if index_revision_ids is None:
        return
    allowed = set(index_revision_ids)
    for chunk in chunks:
        revision = chunk.index_revision_id or (chunk.metadata or {}).get("revision_id")
        if revision is None or revision not in allowed:
            raise StaleEvidenceRevisionError(
                "stale_evidence_revision: retrieved chunk outside frozen revision allow-list"
            )


def _config_identity(config: Any) -> dict[str, Any]:
    if all(hasattr(config, name) for name in ("parsing", "chunking", "embedding")):
        identity = {
            "parsing": config.parsing.canonical_provenance_dict(),
            "parsing_fingerprint": config.parsing.fingerprint(),
            "chunking": config.chunking.canonical_provenance_dict(),
            "chunking_fingerprint": config.chunking.fingerprint(),
            "embedding": config.embedding.canonical_provenance_dict(),
            "embedding_fingerprint": config.embedding.fingerprint(),
        }
        if hasattr(config, "generation"):
            identity["generation"] = config.generation.canonical_provenance_dict()
            identity["generation_fingerprint"] = config.generation.fingerprint()
        if hasattr(config, "synthesis"):
            identity["synthesis"] = config.synthesis.canonical_provenance_dict()
            identity["synthesis_fingerprint"] = config.synthesis.fingerprint()
        if hasattr(config, "reranking"):
            identity["reranking"] = config.reranking.canonical_provenance_dict()
            identity["reranking_fingerprint"] = config.reranking.fingerprint()
        return identity
    return {
        "parser_version": getattr(config, "parser_version", None),
        "chunker_version": getattr(config, "chunker_version", None),
        "embedding_provider": getattr(config, "embedding_provider", None),
        "embedding_model": getattr(config, "embedding_model", None),
        "embedding_model_version": getattr(config, "embedding_model_version", None),
        "embedding_dimensions": getattr(config, "embedding_dimensions", None),
        "embedding_preprocessing_version": getattr(config, "embedding_preprocessing_version", None),
        "retrieval_algorithm_version": getattr(config, "retrieval_algorithm_version", None),
        "index_version": getattr(config, "index_version", None),
        "fusion_method": getattr(config, "fusion_method", None),
        "rrf_k": getattr(config, "rrf_k", None),
        "rerank_enabled": getattr(config, "rerank_enabled", None),
        "rerank_heuristic_enabled": getattr(config, "rerank_heuristic_enabled", None),
        "parent_context_enabled": getattr(config, "parent_context_enabled", None),
    }


def chunk_revision_identity(chunk: Any) -> dict[str, Any]:
    content = getattr(chunk, "content", None) or ""
    content_hash = getattr(chunk, "content_hash", None)
    metadata = getattr(chunk, "metadata", None) or {}
    if not metadata:
        raw_metadata = getattr(chunk, "metadata_json", None)
        if raw_metadata:
            try:
                metadata = json.loads(raw_metadata)
            except (TypeError, ValueError, json.JSONDecodeError):
                metadata = {}
    if not isinstance(metadata, dict):
        metadata = {}
    return {
        "chunk_id": getattr(chunk, "id", None) or getattr(chunk, "chunk_id", None),
        "index_revision_id": getattr(chunk, "revision_id", None)
        or getattr(chunk, "index_revision_id", None)
        or metadata.get("document_revision"),
        "chunk_index": getattr(chunk, "chunk_index", None),
        "content_hash": content_hash
        or metadata.get("content_hash")
        or hashlib.sha256(content.encode("utf-8")).hexdigest(),
        "content_fingerprint": hashlib.sha256(content.encode("utf-8")).hexdigest(),
        "parser_version": getattr(chunk, "parser_version", None) or metadata.get("parser_version"),
        "chunker_version": getattr(chunk, "chunker_version", None)
        or metadata.get("chunker_version"),
        "parent_chunk_id": getattr(chunk, "parent_chunk_id", None),
        "source_unit_ids": metadata.get("source_unit_ids") or metadata.get("source_span_ids"),
        "vector_external_id": getattr(chunk, "vector_external_id", None),
        "metadata": metadata,
    }


def build_evidence_revision_hash(
    *,
    project_id: str | None,
    document_revisions: Iterable[dict[str, Any]],
    config: Any,
) -> str:
    """Hash project identity, indexed document revisions, and RAG versions."""
    documents = []
    for document in document_revisions:
        normalized = dict(document)
        chunks = normalized.get("chunks")
        if isinstance(chunks, list):
            normalized["chunks"] = sorted(
                chunks,
                key=lambda item: (
                    str(item.get("chunk_index", "")),
                    str(item.get("chunk_id", "")),
                ),
            )
        documents.append(normalized)
    documents.sort(key=lambda item: str(item.get("rag_document_id", "")))
    payload = {
        "schema_version": "2",
        "project_id": project_id,
        "documents": documents,
        "rag_config": _config_identity(config),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def build_retrieved_evidence_revision_hash(
    *,
    project_id: str | None,
    document_ids: list[str] | None,
    chunks: Iterable[RetrievedChunk],
    config: Any,
) -> str:
    """Provide a deterministic trace identity for an indexed document set."""
    by_document: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for chunk in chunks:
        by_document[chunk.document_id].append(chunk_revision_identity(chunk))
    documents = [
        {
            "rag_document_id": document_id,
            "chunks": sorted(
                by_document.get(document_id, []),
                key=lambda item: (str(item.get("chunk_index", "")), str(item.get("chunk_id", ""))),
            ),
        }
        for document_id in sorted(by_document if document_ids is None else document_ids)
    ]
    return build_evidence_revision_hash(
        project_id=project_id,
        document_revisions=documents,
        config=config,
    )
