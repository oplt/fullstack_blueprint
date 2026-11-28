"""Group structured table rows without separating them from their headers."""

from __future__ import annotations

from collections.abc import Callable, Iterator
from itertools import takewhile

from backend.modules.rag.domain import ParsedBlock


def _row_text(row: tuple[str, ...]) -> str:
    return " | ".join(
        cell.replace("\\", "\\\\").replace("|", "\\|").replace("\n", " ").strip() for cell in row
    )


def table_groups(
    block: ParsedBlock,
    *,
    source: str,
    csv_row_number: int | None,
    limit: int,
    count: Callable[[str], int],
) -> Iterator[tuple[str, int, int]]:
    """Yield text and zero-based, end-exclusive row ranges in the parser table."""
    rows = block.table_rows
    header_rows = {cell["row"] for cell in block.table_cells if cell.get("is_column_header")}
    header_count = sum(1 for _ in takewhile(header_rows.__contains__, range(len(rows))))
    if not header_count and csv_row_number is None and rows[:1] == (block.table_headers,):
        header_count = 1
    headers = rows[:header_count] or ((block.table_headers,) if block.table_headers else ())
    data = [
        (index, _row_text(row))
        for index, row in enumerate(rows[header_count:], start=header_count)
        if any(cell.strip() for cell in row)
    ]
    if not data:
        return
    if csv_row_number is not None:
        row_index = csv_row_number
        if count(source) > limit:
            raise ValueError("CSV row exceeds the chunk token limit")
        yield source, row_index, row_index + 1
        return
    if count(source) <= limit:
        yield source, data[0][0], data[-1][0] + 1
        return

    header = "\n".join(map(_row_text, headers))
    current: list[str] = [header] if header else []
    start = end = data[0][0]
    for index, row in data:
        if count("\n".join([*current, row])) > limit and end > start:
            yield "\n".join(current), start, end
            current = [header] if header else []
            start = index
        current.append(row)
        if count("\n".join(current)) > limit:
            raise ValueError("Table header and one row exceed the chunk token limit")
        end = index + 1
    yield "\n".join(current), start, end
