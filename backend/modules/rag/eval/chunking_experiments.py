"""Measure chunk-size and overlap candidates on local fixtures."""

from __future__ import annotations

import argparse
import json
import mimetypes
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Any

from backend.lib.vectors import estimate_tokens
from backend.modules.rag.domain.models import ParsedDocument
from backend.modules.rag.infrastructure.langchain_text_splitters import split_documents

FIXTURE_DIR = Path(__file__).with_name("fixtures") / "corpus"
MAX_PREVIEW_CHUNKS = 100
MAX_PREVIEW_CHUNK_TOKENS = 8192


@dataclass(frozen=True, slots=True)
class ChunkingExperimentResult:
    chunk_size: int
    chunk_overlap: int
    chunk_count: int
    total_tokens: int
    duplicate_token_ratio: float


def measure_chunking(
    documents: list[ParsedDocument], *, chunk_size: int, chunk_overlap: int
) -> ChunkingExperimentResult:
    """Measure storage duplication without claiming retrieval-quality superiority."""
    chunks = split_documents(documents, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    source_tokens = sum(estimate_tokens(document.content) for document in documents)
    chunk_tokens = sum(estimate_tokens(content) for content, _metadata in chunks)
    duplicate_ratio = max(0.0, (chunk_tokens - source_tokens) / max(1, source_tokens))
    return ChunkingExperimentResult(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        chunk_count=len(chunks),
        total_tokens=chunk_tokens,
        duplicate_token_ratio=duplicate_ratio,
    )


def recall_at_k(ranked_ids: list[str], relevant_ids: set[str], *, k: int) -> float:
    if not relevant_ids:
        return 1.0
    return len(set(ranked_ids[:k]).intersection(relevant_ids)) / len(relevant_ids)


def mean_reciprocal_rank(ranked_ids: list[str], relevant_ids: set[str]) -> float:
    for index, chunk_id in enumerate(ranked_ids, start=1):
        if chunk_id in relevant_ids:
            return 1.0 / index
    return 0.0


def ranking_metrics_from_fixture(
    ranked_ids: list[str],
    relevant_ids: set[str],
    *,
    k: int = 5,
) -> dict[str, float]:
    """Compute Recall@k / MRR from synthetic fixture rankings (no live retrieval)."""
    return {
        "recall_at_k": recall_at_k(ranked_ids, relevant_ids, k=k),
        "mrr": mean_reciprocal_rank(ranked_ids, relevant_ids),
    }


def run_chunking_experiment_report(
    *,
    documents: list[ParsedDocument] | None = None,
    policies: list[tuple[int, int]] | None = None,
    synthetic_rankings: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Emit a JSON-serializable experiment report from fixtures / synthetic rankings."""
    if documents is None:
        documents = []
        for path in sorted(FIXTURE_DIR.glob("*.txt")):
            documents.append(
                ParsedDocument(
                    content=path.read_text(encoding="utf-8"),
                    metadata={"format": "text", "source": path.name},
                )
            )
    policies = policies or [
        (size, size * overlap // 100)
        for size in (256, 512, 768, 1000)
        for overlap in (0, 10, 15, 20)
    ]
    results = [
        asdict(measure_chunking(documents, chunk_size=size, chunk_overlap=overlap))
        for size, overlap in policies
    ]
    ranking_reports = []
    for item in synthetic_rankings or _default_synthetic_rankings():
        metrics = ranking_metrics_from_fixture(
            list(item["ranked_ids"]),
            set(item["relevant_ids"]),
            k=int(item.get("k", 5)),
        )
        ranking_reports.append({**item, "metrics": metrics})
    return {
        "schema_version": 2,
        "policies": results,
        "ranking_fixtures": ranking_reports,
        "default_justification": (
            "Prose defaults remain 1000/150 pending held-out retrieval measurements. "
            "Synthetic rankings are independent of the tested policies."
        ),
    }


def _default_synthetic_rankings() -> list[dict[str, Any]]:
    return [
        {
            "id": "governance-keyword",
            "ranked_ids": [
                "fixture-governance#0",
                "fixture-participation#0",
                "fixture-multilingual#0",
            ],
            "relevant_ids": ["fixture-governance#0"],
            "k": 5,
        },
        {
            "id": "participation-contradiction",
            "ranked_ids": [
                "fixture-participation#0",
                "fixture-governance#0",
                "fixture-multilingual#0",
            ],
            "relevant_ids": ["fixture-participation#0"],
            "k": 5,
        },
    ]


def preview_file(path: Path, args: argparse.Namespace) -> dict[str, Any]:
    from backend.modules.rag.application.chunking_service import ChunkingService
    from backend.modules.rag.application.document_ingestion_service import (
        _validate_parsed_document_limits,
    )
    from backend.modules.rag.application.document_parser_service import DocumentParserService
    from backend.modules.rag.infrastructure.rag_config import RagConfig

    config = replace(
        RagConfig.from_settings(),
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
        parent_context_enabled=args.parent_window > 0,
        parent_window_size=args.parent_window,
    )
    if args.pdf_parser:
        config = replace(config, pdf_parser=args.pdf_parser)
    with path.open("rb") as source:
        data = source.read(config.max_file_bytes + 1)
    if not data or len(data) > config.max_file_bytes:
        raise ValueError("File is empty or exceeds the configured file size limit")
    parsed = DocumentParserService(config).parse(
        content=data,
        filename=path.name,
        content_type=mimetypes.guess_type(path.name)[0] or "application/octet-stream",
    )
    _validate_parsed_document_limits(parsed, config)
    chunks = ChunkingService(config).chunk_sync(
        parsed, document_id="preview", user_id="preview", filename=path.name
    )
    return {
        "parser": config.pdf_parser,
        "chunk_size": config.chunk_size,
        "chunk_overlap": config.chunk_overlap,
        "parent_window": args.parent_window,
        "chunk_count": len(chunks),
        "chunks": [asdict(chunk) for chunk in chunks[: args.limit]],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preview-file", type=Path, help="Parse and chunk a local document")
    parser.add_argument("--pdf-parser", choices=("auto", "pymupdf", "pypdf", "docling"))
    parser.add_argument("--chunk-size", type=int, default=1000)
    parser.add_argument("--chunk-overlap", type=int, default=150)
    parser.add_argument("--parent-window", type=int, choices=range(0, 21), default=0)
    parser.add_argument("--limit", type=int, default=20, help="Number of preview chunks to print")
    args = parser.parse_args()
    if (
        not 1 <= args.chunk_size <= MAX_PREVIEW_CHUNK_TOKENS
        or not 0 <= args.chunk_overlap < args.chunk_size
    ):
        parser.error("Require 1 <= chunk size <= 8192 and 0 <= overlap < chunk size")
    if not 1 <= args.limit <= MAX_PREVIEW_CHUNKS:
        parser.error("Require 1 <= preview limit <= 100")
    if args.preview_file:
        try:
            report = preview_file(args.preview_file, args)
        except (OSError, ValueError) as exc:
            parser.error(str(exc))
    else:
        report = run_chunking_experiment_report()
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
