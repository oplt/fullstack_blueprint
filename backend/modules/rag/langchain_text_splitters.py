"""Pack sections and table rows while retaining original parser coordinates."""

from __future__ import annotations

import hashlib
import re
from bisect import bisect_left
from collections import defaultdict
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field

from backend.core.vectors import estimate_tokens
from backend.modules.rag.domain import ParsedBlock, ParsedDocument
from backend.modules.rag.source_coordinates import SourceCoordinate
from backend.modules.rag.structured_chunking import table_groups

CHUNKER_VERSION = "structure-v2"
_COORDINATES = "unicode_code_points_zero_based_end_exclusive"
_HEADINGS = re.compile(r"^ {0,3}(?:(#{1,6})[ \t]+([^\n]+)|([^\n]+)\n(={3,}|-{3,})[ \t]*$)", re.M)
_FENCES = re.compile(r"^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ \t]*$|\Z)", re.M)
_PARAGRAPH_BREAK = re.compile(r"\n[ \t\r]*\n")
_SENTENCE_BREAK = re.compile(
    r"""[.!?…]["'”\u2019)]*(?=\s|$)|[。\uff01\uff1f؟\u06d4]["'”\u2019\uff09]*"""
)
_CODE_BOUNDARY = re.compile(r"(?m)^(?:async[ \t]+)?(?:def|class|function|func)[ \t]")
_WS = re.compile(r"\s+")
Span = tuple[int, int]


@dataclass(frozen=True, slots=True)
class Region:
    start: int
    end: int
    section: tuple[str, ...]
    block: ParsedBlock | None = None
    is_code: bool = False


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:32]


def _spans(text: str, start: int, end: int, cuts: Iterator[int]) -> Iterator[Span]:
    for cut in cuts:
        yield from _trimmed_span(text, start, cut)
        start = cut
    yield from _trimmed_span(text, start, end)


def _trimmed_span(text: str, start: int, end: int) -> Iterator[Span]:
    value = text[start:end]
    stripped = value.strip()
    if stripped:
        start += len(value) - len(value.lstrip())
        yield start, start + len(stripped)


def _prose_regions(text: str, start: int, end: int, section: tuple[str, ...]) -> Iterator[Region]:
    path = dict(enumerate(section, start=1))
    for heading in _HEADINGS.finditer(text, start, end):
        if heading.start() > start:
            yield Region(start, heading.start(), tuple(path.values()))
        level = len(heading[1]) if heading[1] else (1 if heading[4].startswith("=") else 2)
        path = {depth: title for depth, title in path.items() if depth < level}
        path[level] = (heading[2] or heading[3]).strip()
        start = heading.start()
    if start < end:
        yield Region(start, end, tuple(path.values()))


def _text_regions(text: str, start: int, end: int, section: tuple[str, ...]) -> Iterator[Region]:
    for fence in _FENCES.finditer(text, start, end):
        for region in _prose_regions(text, start, fence.start(), section):
            section = region.section
            yield region
        yield Region(fence.start(), fence.end(), section, is_code=True)
        start = fence.end()
    yield from _prose_regions(text, start, end, section)


def _regions(doc: ParsedDocument) -> Iterator[Region]:
    text = doc.content
    section = tuple(doc.metadata.get("section_path") or ())
    if not section and (heading := doc.metadata.get("section_heading")):
        section = (heading,)
    cursor = 0
    for block in doc.source_blocks:
        start, end = block.source_span.get("start"), block.source_span.get("end")
        if (
            not isinstance(start, int)
            or not isinstance(end, int)
            or not cursor <= start < end <= len(text)
        ):
            continue
        if block.source_span.get("aligned") is False:
            continue
        special = block.kind in {"table", "table_row", "figure", "code"}
        if special or block.section_path != section:
            yield from _text_regions(text, cursor, start, section)
            section = block.section_path or section
            cursor = start
        if special:
            yield Region(start, end, section, block, is_code=block.kind == "code")
            cursor = end
    yield from _text_regions(text, cursor, len(text), section)


def _bounded_span(
    text: str, start: int, end: int, limit: int, count: Callable[[str], int]
) -> Iterator[Span]:
    """Split an overlong sentence or line without changing any source characters."""
    while start < end:
        low, high = start + 1, min(end, start + limit * 16)
        cut = start
        while low <= high:
            middle = (low + high) // 2
            if count(text[start:middle]) <= limit:
                cut, low = middle, middle + 1
            else:
                high = middle - 1
        if cut == start:
            raise ValueError("One source character exceeds the chunk token limit")
        if (
            cut < end
            and (space := max(text.rfind(" ", start, cut), text.rfind("\t", start, cut))) > start
        ):
            cut = space
        yield from _trimmed_span(text, start, cut)
        start = cut
        if whitespace := _WS.match(text, start, end):
            start = whitespace.end()


def _units(text: str, region: Region, limit: int, count: Callable[[str], int]) -> Iterator[Span]:
    start, end = region.start, region.end
    if region.block is not None and count(text[start:end]) <= limit:
        yield start, end
        return
    cuts = (
        (match.start() for match in _CODE_BOUNDARY.finditer(text, start, end))
        if region.is_code
        else (match.end() for match in _PARAGRAPH_BREAK.finditer(text, start, end))
    )
    for left, right in _spans(text, start, end, cuts):
        if count(text[left:right]) <= limit:
            yield left, right
            continue
        boundaries = (
            re.finditer(r"\n", text[left:right])
            if region.is_code
            else _SENTENCE_BREAK.finditer(text, left, right)
        )
        offset = left if region.is_code else 0
        for first, last in _spans(text, left, right, (m.end() + offset for m in boundaries)):
            if count(text[first:last]) <= limit:
                yield first, last
            else:
                yield from _bounded_span(text, first, last, limit, count)


def _pack(
    text: str, units: Iterator[Span], limit: int, overlap: int, count: Callable[[str], int]
) -> Iterator[list[Span]]:
    current: list[Span] = []
    for start, end in units:
        if current and count(text[current[0][0] : end]) > limit:
            yield current
            keep = len(current)
            while keep > 0 and overlap > 0:
                candidate = current[keep - 1][0]
                if (
                    count(text[candidate : current[-1][1]]) > overlap
                    or count(text[candidate:end]) > limit
                ):
                    break
                keep -= 1
            current = current[keep:]
        current.append((start, end))
    if current:
        yield current


@dataclass(slots=True)
class Source:
    document: ParsedDocument
    revision: str
    scope_type: str
    scope_id: str
    layout: list[tuple[int, int, dict]] = field(init=False, default_factory=list)
    starts: list[int] = field(init=False, default_factory=list)
    ends: list[int] = field(init=False, default_factory=list)

    def __post_init__(self) -> None:
        for block in self.document.source_blocks:
            left, right = block.source_span.get("start"), block.source_span.get("end")
            if (
                isinstance(left, int)
                and isinstance(right, int)
                and block.source_span.get("aligned") is not False
            ):
                self.layout.append(
                    (left, max(left + 1, right), block.to_dict(include_table_data=False))
                )
        self.layout.sort(key=lambda item: item[0])
        for left, right, _ in self.layout:
            self.starts.append(left)
            self.ends.append(max(self.ends[-1], right) if self.ends else right)

    def layout_for(self, start: int, end: int) -> list[dict]:
        first = bisect_left(self.ends, start + 1)
        last = bisect_left(self.starts, end)
        return [item for _, right, item in self.layout[first:last] if right > start]

    def metadata(self, content: str, spans: list[Span], region: Region) -> dict:
        block_kind = region.block.kind if region.block else "prose"
        coordinates = []
        for start, end in spans:
            coordinate: dict[str, object] = {
                **SourceCoordinate(
                    scope_type=self.scope_type,
                    scope_id=self.scope_id,
                    coordinate_system=_COORDINATES,
                    start=start,
                    end=end,
                    source_span_id=f"source-{_hash(f'{self.scope_id}:{start}:{end}')}",
                ).to_dict()
            }
            matching = self.layout_for(start, end)
            if matching:
                coordinate["layout_blocks"] = matching
            coordinates.append(coordinate)
        ids = [coordinate["source_span_id"] for coordinate in coordinates]
        return {
            **{
                key: value
                for key, value in self.document.metadata.items()
                if key not in {"blocks", "table", "rows"}
            },
            "content_hash": _hash(content),
            "chunker_strategy": CHUNKER_VERSION,
            "document_revision": self.revision,
            "offset_scope": self.scope_type,
            "offset_scope_id": self.scope_id,
            "offset_coordinate_system": _COORDINATES,
            "char_start": spans[0][0],
            "char_end": spans[-1][1],
            "source_spans": coordinates,
            "source_span_ids": ids,
            "source_unit_ids": ids,
            "block_ids": list(
                dict.fromkeys(
                    block["block_id"]
                    for coordinate in coordinates
                    for block in coordinate.get("layout_blocks", [])
                )
            )
            or ids,
            "section_path": list(region.section),
            "section_heading": region.section[-1] if region.section else None,
            "structural_parent_id": f"{self.scope_id}:{region.start}:{block_kind}",
        }


def _table_chunks(
    source: Source, region: Region, block: ParsedBlock, limit: int, count: Callable[[str], int]
) -> Iterator[tuple[str, dict]]:
    document = source.document
    raw = document.content[region.start : region.end]
    cells_by_row: dict[int, list[dict]] = defaultdict(list)
    header_cells = []
    for cell in block.table_cells:
        if cell.get("is_column_header"):
            header_cells.append(cell)
        elif isinstance(cell.get("row"), int):
            row = document.metadata.get("row_number", cell["row"])
            cells_by_row[row].append(cell)
    for content, row_start, row_end in table_groups(
        block,
        source=raw,
        csv_row_number=document.metadata.get("row_number"),
        limit=limit,
        count=count,
    ):
        meta = source.metadata(content, [(region.start, region.end)], region)
        meta.update(
            table_block_id=block.block_id,
            table_row_start=row_start,
            table_row_end=row_end,
            table_row_coordinate_system="parser_rows_zero_based_end_exclusive",
            table_headers=list(block.table_headers),
            table_cells=header_cells
            + [cell for index in range(row_start, row_end) for cell in cells_by_row[index]],
            source_text_exact=content == raw,
        )
        yield content, meta


def iter_document_chunks(
    source: Source, *, chunk_size: int, chunk_overlap: int, token_count: Callable[[str], int]
) -> Iterator[tuple[str, dict]]:
    text = source.document.content
    for region in _regions(source.document):
        block = region.block
        if block and block.kind in {"table", "table_row"} and block.table_rows:
            yield from _table_chunks(source, region, block, chunk_size, token_count)
            continue
        units = _units(text, region, chunk_size, token_count)
        for spans in _pack(
            text, units, chunk_size, chunk_overlap if block is None else 0, token_count
        ):
            content = text[spans[0][0] : spans[-1][1]]
            yield content, source.metadata(content, spans, region)


def iter_chunks(
    documents: list[ParsedDocument],
    *,
    chunk_size: int,
    chunk_overlap: int,
    document_revision: str | None = None,
    token_count: Callable[[str], int] = estimate_tokens,
    document_index_start: int = 0,
) -> Iterator[tuple[str, dict]]:
    if chunk_size < 1 or not 0 <= chunk_overlap < chunk_size:
        raise ValueError("Chunk overlap must be nonnegative and smaller than the chunk size")
    for index, doc in enumerate(documents, start=document_index_start):
        revision = str(
            document_revision
            or doc.metadata.get("document_revision")
            or doc.metadata.get("checksum_sha256")
            or _hash(doc.content)
        )
        page = doc.page_number if doc.page_number is not None else doc.metadata.get("page_number")
        scope_type = "page" if page is not None else "parsed_document"
        scope_id = f"{doc.metadata.get('offset_scope_id') or scope_type}:{revision}:{page}:{index}"
        source = Source(doc, revision, scope_type, scope_id)
        for pack_index, (content, meta) in enumerate(
            iter_document_chunks(
                source, chunk_size=chunk_size, chunk_overlap=chunk_overlap, token_count=token_count
            )
        ):
            yield content, {**meta, "pack_index": pack_index, "page_number": page}


def split_documents(
    documents: list[ParsedDocument],
    *,
    chunk_size: int,
    chunk_overlap: int,
    document_revision: str | None = None,
    token_count: Callable[[str], int] = estimate_tokens,
) -> list[tuple[str, dict]]:
    return list(
        iter_chunks(
            documents,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            document_revision=document_revision,
            token_count=token_count,
        )
    )
