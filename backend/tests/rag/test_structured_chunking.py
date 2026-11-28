from types import SimpleNamespace

import pytest
from backend.core.vectors import estimate_tokens
from backend.modules.rag.chunking import ChunkingService
from backend.modules.rag.domain import ParsedBlock, ParsedDocument
from backend.modules.rag.langchain_text_splitters import split_documents


def test_overlap_keeps_exact_source_text_and_respects_budget() -> None:
    text = "A long first paragraph.\n\nNext paragraph is long.\n\nThird paragraph here."
    chunks = split_documents([ParsedDocument(text)], chunk_size=8, chunk_overlap=2)
    assert all(estimate_tokens(content) <= 8 for content, _ in chunks)
    for content, meta in chunks:
        assert text[meta["char_start"] : meta["char_end"]] == content
    assert len(chunks) == 3


def test_multilingual_sentences_split_only_at_source_offsets() -> None:
    text = "第一句话说明了研究结果。第二句话提供更多的证据。第三句话总结了这项工作。"
    chunks = split_documents([ParsedDocument(text)], chunk_size=4, chunk_overlap=0)
    assert [content for content, _ in chunks] == [
        "第一句话说明了研究结果。",
        "第二句话提供更多的证据。",
        "第三句话总结了这项工作。",
    ]


def test_code_fence_keeps_function_body_and_heading_path() -> None:
    text = (
        "# Manual\n\n## API\n\n```python\ndef one():\n    return 1\n\ndef two():\n    return 2\n```"
    )
    chunks = split_documents([ParsedDocument(text)], chunk_size=9, chunk_overlap=0)
    functions = [(content, meta) for content, meta in chunks if "def " in content]
    assert [content.count("def ") for content, _ in functions] == [1, 1]
    assert all("\n    return " in content for content, _ in functions)
    assert all(meta["section_path"] == ["Manual", "API"] for _, meta in functions)


def test_table_row_groups_repeat_header_without_leaking_adjacent_prose() -> None:
    table = "Site | Count (kg)\nAlpha | 12\nBeta | 34\nGamma | 56"
    text = f"{table}\n\nOther section"
    block = ParsedBlock(
        block_id="table-1",
        kind="table",
        reading_order=0,
        source_span={"start": 0, "end": len(table)},
        section_path=("Results",),
        table_headers=("Site", "Count (kg)"),
        table_rows=(("Site", "Count (kg)"), ("Alpha", "12"), ("Beta", "34"), ("Gamma", "56")),
        table_cells=tuple({"row": index, "column": 0, "bbox": [0, 1, 2, 3]} for index in range(4)),
    )
    chunks = split_documents(
        [ParsedDocument(text, {"sheet_id": "Sales"}, source_blocks=[block])],
        chunk_size=8,
        chunk_overlap=2,
        document_revision="revision-1",
    )
    tables = [(content, meta) for content, meta in chunks if meta.get("table_block_id")]
    assert [content for content, _ in tables] == [
        "Site | Count (kg)\nAlpha | 12",
        "Site | Count (kg)\nBeta | 34",
        "Site | Count (kg)\nGamma | 56",
    ]
    assert [meta["table_row_start"] for _, meta in tables] == [1, 2, 3]
    assert [[cell["row"] for cell in meta["table_cells"]] for _, meta in tables] == [[1], [2], [3]]
    assert all(
        meta["sheet_id"] == "Sales" and meta["section_path"] == ["Results"] for _, meta in tables
    )
    assert all(estimate_tokens(content) <= 8 for content, _ in tables)


@pytest.mark.parametrize("rows", [(("Header",),), (("Header",), ("",))])
def test_header_only_tables_are_not_retrievable(rows) -> None:
    doc = ParsedDocument(
        "Header",
        source_blocks=[
            ParsedBlock(
                "header-only",
                "table",
                0,
                {"start": 0, "end": 6},
                table_headers=("Header",),
                table_rows=rows,
            )
        ],
    )
    assert split_documents([doc], chunk_size=10, chunk_overlap=0) == []


def test_source_span_ids_distinguish_identical_units_on_one_page() -> None:
    documents = [ParsedDocument("same text", page_number=1) for _ in range(2)]
    chunks = split_documents(documents, chunk_size=10, chunk_overlap=0, document_revision="r")
    assert chunks[0][1]["source_span_ids"] != chunks[1][1]["source_span_ids"]


@pytest.mark.asyncio
async def test_ingestion_keeps_full_table_in_one_nonretrieval_parent(monkeypatch) -> None:
    async def run_inline(function, /, *args, **kwargs):
        return function(*args, **kwargs)

    monkeypatch.setattr("backend.modules.rag.chunking.asyncio.to_thread", run_inline)
    raw = "Name | Value\nAlpha | 12\nBeta | 34\nGamma | 56"
    table = ParsedBlock(
        "table-1",
        "table",
        0,
        {"start": 0, "end": len(raw)},
        table_headers=("Name", "Value"),
        table_rows=(("Name", "Value"), ("Alpha", "12"), ("Beta", "34"), ("Gamma", "56")),
    )
    config = SimpleNamespace(
        chunk_size=7,
        chunk_overlap=2,
        parent_context_enabled=True,
        parent_window_size=2,
        max_ingestion_chunks=10,
        max_ingestion_tokens=100,
    )
    document = ParsedDocument(
        raw, {"sheet_id": "A", "parsed_block_type": "table"}, source_blocks=[table]
    )
    chunks = await ChunkingService(config).chunk(
        [document], document_id="doc", document_revision="r", user_id="user", filename="table"
    )
    parents = [chunk for chunk in chunks if chunk.chunk_index < 0]
    children = [chunk for chunk in chunks if chunk.chunk_index >= 0]
    assert len(parents) == 1
    assert parents[0].content == raw
    assert len(children) == 3
    assert {child.parent_chunk_id for child in children} == {parents[0].id}
    assert all(child.token_count <= 7 for child in children)
