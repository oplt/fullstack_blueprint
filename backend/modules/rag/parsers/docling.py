"""Optional Docling parser adapter with a safe baseline fallback boundary."""

from __future__ import annotations

import hashlib
import importlib.metadata
import tempfile
import threading
from dataclasses import replace
from pathlib import Path
from typing import Any

from backend.modules.rag.domain import ParsedBlock, ParsedDocument


class DoclingParserAdapter:
    name = "docling"
    parser_version = "docling-structured-v1"

    def __init__(self) -> None:
        self._worker_state = threading.local()

    def parse(self, *, content: bytes, filename: str, content_type: str) -> list[ParsedDocument]:
        suffix = Path(filename).suffix or ".bin"
        with tempfile.NamedTemporaryFile(suffix=suffix) as temporary:
            temporary.write(content)
            temporary.flush()
            result = self._converter().convert(temporary.name)
        document = result.document
        source_hash = hashlib.sha256(content).hexdigest()
        try:
            library_version = importlib.metadata.version("docling")
        except importlib.metadata.PackageNotFoundError:  # pragma: no cover - test adapter
            library_version = "unknown"
        parser_version = f"{self.parser_version}+{library_version}"
        return _normalized_docling_documents(
            document,
            format_name=suffix.lstrip(".") or content_type,
            source_hash=source_hash,
            parser_version=parser_version,
        )

    def _converter(self):
        converter = getattr(self._worker_state, "converter", None)
        if converter is None:
            try:
                from docling.document_converter import (  # type: ignore[reportMissingImports]
                    DocumentConverter,
                )
            except ImportError as exc:  # pragma: no cover - optional integration
                raise RuntimeError(
                    "Docling is not installed; provision the optional package in this runtime"
                ) from exc
            converter = DocumentConverter()
            self._worker_state.converter = converter
        return converter


def _value(item: Any, key: str, default=None):
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


def _enum_value(value: Any) -> str:
    return str(getattr(value, "value", value)).lower()


def _integer_value(item: Any, key: str, default: int) -> int:
    value = _value(item, key, default)
    return default if value is None else int(value)


def _bbox_values(value: Any) -> tuple[tuple[float, float, float, float] | None, str | None]:
    if value is None:
        return None, None
    try:
        box = (
            float(value.l),
            float(value.t),
            float(value.r),
            float(value.b),
        )
    except (AttributeError, TypeError, ValueError):
        return None, None
    origin = _enum_value(getattr(value, "coord_origin", "unknown"))
    origin_name = {"topleft": "top_left", "bottomleft": "bottom_left"}.get(origin)
    coordinate_system = f"page_points_{origin_name}" if origin_name else "page_points_unknown"
    return box, coordinate_system


def _table_structure(
    item: Any, document: Any
) -> tuple[str, tuple[str, ...], tuple[tuple[str, ...], ...], tuple[dict, ...]]:
    data = _value(item, "data")
    grid = _value(data, "grid", []) or []
    rows: list[tuple[str, ...]] = []
    cells: list[dict] = []
    headers: list[str] = []
    for row_index, row in enumerate(grid):
        values: list[str] = []
        for column_index, cell in enumerate(row):
            text = str(_value(cell, "text", "") or "")
            values.append(text)
            bbox, coord_system = _bbox_values(_value(cell, "bbox"))
            is_header = bool(_value(cell, "column_header", False))
            if is_header:
                headers.append(text)
            cell_data = {
                "row": _integer_value(cell, "start_row_offset_idx", row_index),
                "column": _integer_value(cell, "start_col_offset_idx", column_index),
                "row_span": _integer_value(cell, "row_span", 1),
                "column_span": _integer_value(cell, "col_span", 1),
                "is_column_header": is_header,
                "is_row_header": bool(_value(cell, "row_header", False)),
                "bbox": list(bbox) if bbox else None,
                "bbox_coordinate_system": coord_system,
            }
            cells.append(cell_data)
        rows.append(tuple(values))
    markdown = str(
        item.export_to_markdown(doc=document) if hasattr(item, "export_to_markdown") else ""
    )
    return markdown.strip(), tuple(headers), tuple(rows), tuple(cells)


def _item_content(item: Any, document: Any, label: str):
    if label == "table":
        return _table_structure(item, document)
    if label in {"picture", "chart"}:
        caption = _value(item, "caption_text")
        return (str(caption(document) if callable(caption) else "").strip(), (), (), ())
    return (str(_value(item, "text", "") or "").strip(), (), (), ())


def _source_geometry(provenance: list[Any]):
    page_numbers = [
        int(page) for entry in provenance if (page := _value(entry, "page_no")) is not None
    ]
    bbox, bbox_coordinate_system = _bbox_values(
        _value(provenance[0], "bbox") if provenance else None
    )
    parser_spans = []
    for entry in provenance:
        span = _value(entry, "charspan")
        span_start, span_end = ([*list(span), None, None])[:2] if span else (None, None)
        span_bbox, span_coord = _bbox_values(_value(entry, "bbox"))
        parser_spans.append(
            {
                "page_number": _value(entry, "page_no"),
                "start": span_start,
                "end": span_end,
                "coordinate_system": "docling_charspan_zero_based_end_exclusive",
                "bbox": list(span_bbox) if span_bbox else None,
                "bbox_coordinate_system": span_coord,
            }
        )
    return page_numbers, bbox, bbox_coordinate_system, parser_spans


def _normalized_kind(label: str) -> str:
    return {
        "title": "title",
        "section_header": "heading",
        "list_item": "list",
        "table": "table",
        "picture": "figure",
        "chart": "figure",
        "code": "code",
        "formula": "equation",
    }.get(label, "paragraph")


def _normalized_docling_item(
    item: Any,
    *,
    document: Any,
    source_hash: str,
    parser_version: str,
    reading_order: int,
    section_path: tuple[str, ...],
):
    label = _enum_value(_value(item, "label", "text"))
    text, table_headers, table_rows, table_cells = _item_content(item, document, label)
    kind = _normalized_kind(label)
    if not text and kind != "figure":
        return None

    provenance = list(_value(item, "prov", []) or [])
    page_numbers, bbox, bbox_coord, parser_spans = _source_geometry(provenance)
    item_meta = _value(item, "meta")
    confidence = _value(item_meta, "ocr_confidence")
    source_ref = str(_value(item, "self_ref", "") or reading_order)
    block_id_payload = "\0".join(
        (
            source_hash,
            parser_version,
            source_ref,
            str(min(page_numbers) if page_numbers else None),
            text,
        )
    )
    block_id = f"block-{hashlib.sha256(block_id_payload.encode()).hexdigest()[:32]}"
    block = ParsedBlock(
        block_id=block_id,
        kind=kind,
        reading_order=reading_order,
        source_span={
            "coordinate_system": "parsed_page_codepoints_zero_based_end_exclusive",
            "start": 0,
            "end": 0,
            "parser_spans": parser_spans,
            "parser_char_start": parser_spans[0]["start"] if parser_spans else None,
            "parser_char_end": parser_spans[0]["end"] if parser_spans else None,
        },
        source_document_hash=source_hash,
        page_start=min(page_numbers) if page_numbers else None,
        page_end=max(page_numbers) if page_numbers else None,
        bbox=bbox,
        bbox_coordinate_system=bbox_coord,
        section_path=section_path,
        language=_value(item_meta, "language"),
        parser_name="docling",
        parser_version=parser_version,
        ocr_confidence=float(confidence) if confidence is not None else None,
        table_headers=table_headers,
        table_rows=table_rows,
        table_cells=table_cells,
    )
    page_number = min(page_numbers) if page_numbers else None
    return page_number, text, block


def _normalized_docling_documents(
    document: Any,
    *,
    format_name: str,
    source_hash: str,
    parser_version: str,
) -> list[ParsedDocument]:
    """Convert Docling's ordered items into page-local normalized blocks."""
    if not hasattr(document, "iterate_items"):
        raise RuntimeError("Installed Docling does not expose structured item iteration")

    page_items: dict[int | None, list[tuple[str, ParsedBlock]]] = {}
    section_by_level: dict[int, str] = {}
    layout_available = False
    tables_available = False
    for reading_order, item_and_level in enumerate(document.iterate_items(traverse_pictures=True)):
        item, level = item_and_level
        label = _enum_value(_value(item, "label", "text"))
        heading_text = str(_value(item, "text", "") or "").strip()
        if label in {"section_header", "title"} and heading_text:
            section_by_level = {
                depth: heading for depth, heading in section_by_level.items() if depth < int(level)
            }
            section_by_level[int(level)] = heading_text
        section_path = tuple(section_by_level[depth] for depth in sorted(section_by_level))
        normalized_item = _normalized_docling_item(
            item,
            document=document,
            source_hash=source_hash,
            parser_version=parser_version,
            reading_order=reading_order,
            section_path=section_path,
        )
        if normalized_item is None:
            continue
        page_number, text, block = normalized_item
        layout_available = layout_available or block.bbox is not None
        tables_available = tables_available or bool(block.table_rows)
        page_items.setdefault(page_number, []).append((text, block))

    normalized: list[ParsedDocument] = []
    for page_number, items in page_items.items():
        content_parts: list[str] = []
        blocks: list[ParsedBlock] = []
        cursor = 0
        for text, block in items:
            if content_parts:
                content_parts.append("\n\n")
                cursor += 2
            start = cursor
            content_parts.append(text)
            cursor += len(text)
            blocks.append(
                replace(block, source_span={**block.source_span, "start": start, "end": cursor})
            )
        content = "".join(content_parts).strip()
        normalized.append(
            ParsedDocument(
                content=content,
                page_number=page_number,
                metadata={
                    "format": format_name,
                    "parser": "docling",
                    "parser_version": parser_version,
                    "parser_trust": "untrusted_document_data",
                    "normalized_block_model": "source-block-v1",
                    "layout_provenance_available": layout_available,
                    "tables_preserved": tables_available,
                },
                source_blocks=blocks,
            )
        )
    return normalized
