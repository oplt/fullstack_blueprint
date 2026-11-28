import sys
from types import ModuleType, SimpleNamespace

import pytest

from backend.modules.rag.domain import ParsedBlock, ParsedDocument
from backend.modules.rag.langchain_text_splitters import split_documents
from backend.modules.rag.parsers.docling import DoclingParserAdapter
from backend.modules.rag.parsing import DocumentParserService
from backend.modules.rag.provenance import normalize_parsed_documents


def _bbox(left: float, top: float, right: float, bottom: float):
    return SimpleNamespace(l=left, t=top, r=right, b=bottom, coord_origin="TOPLEFT")


def _provenance(page: int, bbox, start: int, end: int):
    return SimpleNamespace(page_no=page, bbox=bbox, charspan=(start, end))


class _DoclingItem:
    def __init__(  # noqa: PLR0913 - mirrors Docling item and provenance fields
        self,
        ref: str,
        label: str,
        text: str,
        *,
        level: int,
        page: int,
        bbox,
        charspan=(0, 1),
    ) -> None:
        self.self_ref = ref
        self.label = label
        self.text = text
        self.level = level
        self.prov = [_provenance(page, bbox, *charspan)]
        self.data = None
        self.meta = None

    def export_to_markdown(self, *, doc) -> str:
        del doc
        return self.text

    def caption_text(self, _doc) -> str:
        return self.text


def test_docling_parser_preserves_order_layout_sections_and_table_cells(monkeypatch) -> None:
    heading = _DoclingItem(
        "#/texts/0",
        "section_header",
        "Methods",
        level=1,
        page=1,
        bbox=_bbox(20, 10, 100, 30),
        charspan=(0, 7),
    )
    paragraph = _DoclingItem(
        "#/texts/1",
        "text",
        "The sample included 12 sites.",
        level=2,
        page=1,
        bbox=_bbox(20, 40, 400, 65),
        charspan=(8, 37),
    )
    table = _DoclingItem(
        "#/tables/0",
        "table",
        "",
        level=2,
        page=1,
        bbox=_bbox(20, 80, 400, 150),
        charspan=(38, 38),
    )

    def table_markdown(*, doc):
        del doc
        return "| Site | Count |\n| --- | --- |\n| A | 12 |"

    table.export_to_markdown = table_markdown
    table.data = SimpleNamespace(
        grid=[
            [
                SimpleNamespace(text="Site", column_header=True, bbox=_bbox(20, 80, 100, 95)),
                SimpleNamespace(text="Count", column_header=True, bbox=_bbox(100, 80, 200, 95)),
            ],
            [
                SimpleNamespace(text="A", column_header=False, bbox=_bbox(20, 95, 100, 110)),
                SimpleNamespace(text="12", column_header=False, bbox=_bbox(100, 95, 200, 110)),
            ],
        ]
    )

    def iterate_items(*, traverse_pictures):
        assert traverse_pictures is True
        return iter([(heading, 1), (paragraph, 2), (table, 2)])

    document = SimpleNamespace(iterate_items=iterate_items)

    package = ModuleType("docling")
    package.__path__ = []
    converter_module = ModuleType("docling.document_converter")
    converter_module.DocumentConverter = lambda: SimpleNamespace(
        convert=lambda _path: SimpleNamespace(document=document)
    )
    monkeypatch.setitem(sys.modules, "docling", package)
    monkeypatch.setitem(sys.modules, "docling.document_converter", converter_module)

    parsed = DoclingParserAdapter().parse(
        content=b"sample pdf", filename="sample.pdf", content_type="application/pdf"
    )

    assert len(parsed) == 1
    blocks = parsed[0].source_blocks
    assert [block.kind for block in blocks] == ["heading", "paragraph", "table"]
    assert blocks[1].section_path == ("Methods",)
    assert blocks[1].reading_order == 1
    assert blocks[1].bbox == (20.0, 40.0, 400.0, 65.0)
    assert blocks[1].bbox_coordinate_system == "page_points_top_left"
    assert blocks[2].table_headers == ("Site", "Count")
    assert blocks[2].table_rows == (("Site", "Count"), ("A", "12"))
    assert len(blocks[2].table_cells) == 4
    assert blocks[2].table_cells[0]["bbox"] == [20.0, 80.0, 100.0, 95.0]
    assert blocks[2].source_span["start"] < blocks[2].source_span["end"]
    repeated = DoclingParserAdapter().parse(
        content=b"sample pdf", filename="sample.pdf", content_type="application/pdf"
    )
    assert [block.block_id for block in blocks] == [
        block.block_id for block in repeated[0].source_blocks
    ]


def test_parser_service_binds_block_ids_to_document_revision(monkeypatch) -> None:
    def baseline_parse(**_kwargs):
        return [ParsedDocument(content="A source paragraph.", metadata={"format": "text"})]

    monkeypatch.setattr(
        "backend.modules.rag.parsers.loaders.parse_documents_from_bytes",
        baseline_parse,
    )
    service = DocumentParserService(SimpleNamespace(docling_enabled=False, pdf_parser="auto"))
    parsed = service.parse(
        content=b"source",
        filename="source.txt",
        content_type="text/plain",
        metadata={"document_id": "doc-1", "document_revision_id": "revision-1"},
    )

    assert parsed[0].source_blocks[0].document_id == "doc-1"
    assert parsed[0].source_blocks[0].revision_id == "revision-1"
    assert parsed[0].source_blocks[0].source_document_hash


def test_baseline_markdown_blocks_keep_nested_heading_hierarchy(monkeypatch) -> None:
    from backend.modules.rag.parsers.loaders import _parse_markdown

    def baseline_parse(*, content, **_kwargs):
        return _parse_markdown(content)

    monkeypatch.setattr(
        "backend.modules.rag.parsers.loaders.parse_documents_from_bytes",
        baseline_parse,
    )
    service = DocumentParserService(SimpleNamespace(docling_enabled=False, pdf_parser="auto"))
    parsed = service.parse(
        content=b"# Results\n\n## Tables\n\nValues are listed.",
        filename="source.md",
        content_type="text/markdown",
    )

    assert parsed[0].source_blocks[0].section_path == ("Results",)
    assert parsed[1].source_blocks[0].section_path == ("Results", "Tables")


def test_baseline_pdf_layout_and_table_metadata_use_common_block_shape() -> None:
    parsed = normalize_parsed_documents(
        [
            ParsedDocument(
                "Alpha\n\nBeta",
                metadata={
                    "format": "pdf",
                    "parser": "pymupdf-blocks-v1",
                    "page_number": 3,
                    "blocks": [
                        {
                            "block_id": "pdf-block-1",
                            "text": "Alpha",
                            "bbox": [10, 20, 80, 35],
                            "reading_order": 0,
                        },
                        {
                            "block_id": "pdf-block-2",
                            "text": "Beta",
                            "bbox": [10, 40, 80, 55],
                            "reading_order": 1,
                        },
                    ],
                },
                page_number=3,
            ),
            ParsedDocument(
                "A | 12",
                metadata={
                    "format": "pdf",
                    "parser": "pymupdf-blocks-v1",
                    "parsed_block_type": "table",
                    "page_number": 3,
                    "table": {
                        "bbox": [10, 60, 100, 90],
                        "rows": [["A", "12"]],
                        "cells": [{"row": 0, "column": 1, "bbox": [55, 60, 100, 90]}],
                    },
                },
                page_number=3,
            ),
        ],
        source_document_hash="sha256:source",
        document_id="document-3",
        revision_id="revision-3",
    )

    assert [block.kind for block in parsed[0].source_blocks] == ["paragraph", "paragraph"]
    assert parsed[0].source_blocks[1].reading_order == 1
    assert parsed[0].source_blocks[1].bbox == (10.0, 40.0, 80.0, 55.0)
    table = parsed[1].source_blocks[0]
    assert table.kind == "table"
    assert table.table_rows == (("A", "12"),)
    assert table.table_cells[0]["bbox"] == [55, 60, 100, 90]
    assert table.revision_id == "revision-3"


def test_chunk_source_coordinates_include_overlapping_layout_blocks() -> None:
    block = ParsedBlock(
        block_id="block-1",
        kind="paragraph",
        document_id="doc-1",
        revision_id="revision-1",
        reading_order=0,
        source_span={"start": 0, "end": 20, "coordinate_system": "parsed_document_codepoints"},
        page_start=2,
        page_end=2,
        bbox=(10.0, 20.0, 90.0, 40.0),
        bbox_coordinate_system="page_points_top_left",
        section_path=("Results",),
        parser_name="docling",
        parser_version="docling-test",
    )

    chunks = split_documents(
        [ParsedDocument("A source paragraph.", page_number=2, source_blocks=[block])],
        chunk_size=100,
        chunk_overlap=0,
        document_revision="revision-1",
    )

    layout = chunks[0][1]["source_spans"][0]["layout_blocks"][0]
    assert layout["block_id"] == "block-1"
    assert layout["bbox"] == [10.0, 20.0, 90.0, 40.0]
    assert layout["section_path"] == ["Results"]


def test_docling_configuration_fails_startup_when_optional_extra_is_missing(monkeypatch) -> None:
    import importlib.util

    from backend.modules.rag.config import RagConfig, validate_rag_config

    config = RagConfig.from_settings()
    config = config.__class__(
        **{
            **{field: getattr(config, field) for field in config.__dataclass_fields__},
            "enabled": True,
            "docling_enabled": True,
            "pdf_parser": "docling",
        }
    )
    monkeypatch.setattr(importlib.util, "find_spec", lambda _name: None)

    with pytest.raises(RuntimeError, match=r"docling.*package"):
        validate_rag_config(config)
