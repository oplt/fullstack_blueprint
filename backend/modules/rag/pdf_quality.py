"""Deterministic PDF text-quality and repeated-header helpers."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class OcrDecision:
    should_ocr: bool
    quality: float
    reason: str


def decide_ocr(
    text: str,
    *,
    ocr_enabled: bool,
    quality_threshold: float,
    min_text_chars: int,
) -> OcrDecision:
    normalized = " ".join(text.split())
    if not ocr_enabled:
        return OcrDecision(False, _quality(normalized), "ocr_disabled")
    if len(normalized) < min_text_chars:
        return OcrDecision(True, _quality(normalized), "text_below_minimum")
    quality = _quality(normalized)
    return OcrDecision(quality < quality_threshold, quality, "quality_below_threshold")


def suppress_repeated_headers_footers(page_texts: list[str]) -> list[str]:
    """Remove identical first/last lines repeated across at least two pages."""

    lines_by_page = [
        [line.strip() for line in text.splitlines() if line.strip()] for text in page_texts
    ]
    candidates: dict[str, int] = {}
    for lines in lines_by_page:
        for line in {lines[0], lines[-1]} if lines else set():
            candidates[line] = candidates.get(line, 0) + 1
    repeated = {line for line, count in candidates.items() if count >= 2}
    cleaned: list[str] = []
    for lines in lines_by_page:
        while lines and lines[0] in repeated:
            lines.pop(0)
        while lines and lines[-1] in repeated:
            lines.pop()
        cleaned.append("\n".join(lines))
    return cleaned


def _quality(text: str) -> float:
    if not text:
        return 0.0
    printable = sum(character.isprintable() for character in text)
    return printable / len(text)


__all__ = ["OcrDecision", "decide_ocr", "suppress_repeated_headers_footers"]
