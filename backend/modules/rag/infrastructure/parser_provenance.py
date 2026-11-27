"""Normalize baseline parser output into revision-bound source blocks."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, replace
from typing import Any

from backend.modules.rag.domain.models import ParsedBlock, ParsedDocument

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
    for offset, item in enumerate(source_items):
        item = item if isinstance(item, dict) else {}
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
