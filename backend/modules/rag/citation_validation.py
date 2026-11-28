"""Server-side claim-level citation validation (never trust model IDs)."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from backend.modules.rag.context import citation_text
from backend.modules.rag.policies import RagPolicyService
from backend.modules.rag.citation_validation_context import CitationValidationContext
from backend.modules.rag.domain import Citation, ClaimCitation, RetrievedChunk

_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)

CitationValidationStatus = Literal[
    "valid",
    "no_evidence",
    "partial",
    "unstructured",
    "invalid",
    "missing_claims",
    "incomplete",
    "empty_answer",
    "answer_mismatch",
    "revision_mismatch",
    "unsupported_claim",
]


@dataclass(slots=True)
class ValidatedAnswer:
    answer: str
    claims: list[ClaimCitation]
    citations: list[Citation]
    citation_validation_failed: bool = False
    citation_validation_status: CitationValidationStatus = "valid"
    no_evidence: bool = False


class RagStructuredClaim(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=4000)
    chunk_ids: list[str] = Field(min_length=1, max_length=8)


class RagStructuredAnswer(BaseModel):
    """The only provider contract accepted for grounded RAG answers."""

    model_config = ConfigDict(extra="forbid")

    claims: list[RagStructuredClaim] = Field(default_factory=list, max_length=20)
    no_evidence: bool
    insufficient_evidence_reason: str | None = Field(default=None, max_length=1000)


def _parse_structured_payload(raw: str) -> dict | None:
    text = (raw or "").strip()
    if not text:
        return None
    match = _JSON_FENCE.fullmatch(text)
    if match:
        text = match.group(1).strip()
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _chunk_revision_id(chunk: RetrievedChunk) -> str | None:
    revision = chunk.index_revision_id
    if revision:
        return revision
    metadata = chunk.metadata or {}
    for key in ("index_revision_id", "revision_id", "document_revision"):
        value = metadata.get(key)
        if isinstance(value, str) and value:
            return value
    return None


def _citation_from_chunk(
    chunk: RetrievedChunk,
    *,
    citation_number: int | None = None,
    used_in_answer: bool = False,
    quote: str | None = None,
) -> Citation:
    return Citation(
        document_id=chunk.document_id,
        chunk_id=chunk.chunk_id,
        filename=chunk.filename,
        score=chunk.score,
        snippet=(quote or citation_text(chunk))[:400],
        page_number=chunk.page_number,
        chunk_index=chunk.chunk_index,
        citation_number=citation_number,
        section_heading=(chunk.metadata or {}).get("section_heading"),
        used_in_answer=used_in_answer,
        char_start=(chunk.metadata or {}).get("char_start"),
        char_end=(chunk.metadata or {}).get("char_end"),
        source_span_ids=(chunk.metadata or {}).get("source_span_ids"),
        parent_context_id=chunk.parent_context_id,
        offset_coordinate_system=(chunk.metadata or {}).get("offset_coordinate_system"),
        offset_scope=(chunk.metadata or {}).get("offset_scope"),
        offset_scope_id=(chunk.metadata or {}).get("offset_scope_id"),
        source_spans=(chunk.metadata or {}).get("source_spans"),
        index_revision_id=_chunk_revision_id(chunk),
    )


def _unused_citations(retrieved_chunks: list[RetrievedChunk]) -> list[Citation]:
    return [
        _citation_from_chunk(c, citation_number=None, used_in_answer=False)
        for c in retrieved_chunks
    ]


INSUFFICIENT_EVIDENCE_ANSWER = "The retrieved evidence is insufficient to answer this question."
_SENTENCES = re.compile(r"(?<=[.!?])\s+|(?<=[。\uff01\uff1f])")


def _source_units(chunk: RetrievedChunk) -> set[str]:
    """Match complete verbatim units, keeping all values and qualifiers in each."""
    text = citation_text(chunk)
    if RagPolicyService().contains_prompt_injection(text):
        return set()
    if chunk.metadata.get("table_block_id") or chunk.metadata.get("parsed_block_type") == "table":
        rows = [line.strip() for line in text.splitlines() if line.strip()]
        if chunk.metadata.get("format") == "csv":
            return set(rows)
        if text.lstrip().startswith("{") and chunk.metadata.get("table_row_start") is not None:
            return {text.strip()}
        if chunk.metadata.get("table_headers") and rows:
            header = rows[0]
            return {f"{header}\n{row}" for row in rows[1:] if not re.fullmatch(r"[| :-]+", row)}
        return set(rows)
    return {sentence.strip() for sentence in _SENTENCES.split(text) if sentence.strip()}


def _resolve_revision_binding(
    *,
    context: CitationValidationContext | None,
    expected_index_revision_ids: list[str] | None,
) -> tuple[set[str] | None, dict[str, str], bool]:
    """Return (allowed revision ids, per-document map, require revision identity)."""
    revision_by_document: dict[str, str] = {}
    expected_revisions: set[str] | None = None
    require_revision = False

    if expected_index_revision_ids is not None:
        expected_revisions = set(expected_index_revision_ids)
        require_revision = True

    if context is not None:
        if context.revision_by_document:
            revision_by_document = dict(context.revision_by_document)
            require_revision = True
        if context.index_revision_ids:
            context_revisions = set(context.index_revision_ids)
            expected_revisions = (
                context_revisions
                if expected_revisions is None
                else expected_revisions & context_revisions
            )
            require_revision = True
        if context.evidence_revision_hash:
            require_revision = True

    return expected_revisions, revision_by_document, require_revision


def _retrieved_revisions_consistent(
    retrieved_chunks: list[RetrievedChunk],
    *,
    expected_revisions: set[str] | None,
    revision_by_document: dict[str, str],
    evidence_revision_hash: str | None,
) -> bool:
    """Fail closed when a frozen evidence hash cannot be reconciled with chunks."""
    if not retrieved_chunks:
        return True
    if expected_revisions is None and not revision_by_document:
        # Hash present but no revision allow-list → cannot verify; fail closed.
        return not evidence_revision_hash

    seen_by_document: dict[str, str] = {}
    for chunk in retrieved_chunks:
        revision = _chunk_revision_id(chunk)
        expected_for_doc = revision_by_document.get(chunk.document_id)
        prior = seen_by_document.get(chunk.document_id)
        if (
            revision is None
            or (expected_revisions is not None and revision not in expected_revisions)
            or (expected_for_doc is not None and revision != expected_for_doc)
            or (prior is not None and prior != revision)
        ):
            return False
        seen_by_document[chunk.document_id] = revision
    return True


def _chunk_authorized(
    chunk: RetrievedChunk,
    *,
    allowed_docs: set[str] | None,
    expected_revisions: set[str] | None,
    revision_by_document: dict[str, str],
    require_revision: bool,
) -> bool:
    if allowed_docs is not None and chunk.document_id not in allowed_docs:
        return False

    revision = _chunk_revision_id(chunk)
    if require_revision and revision is None:
        # Missing revision must not be silently upgraded to "current".
        return False
    if expected_revisions is not None and (revision is None or revision not in expected_revisions):
        return False
    expected_for_doc = revision_by_document.get(chunk.document_id)
    return not (expected_for_doc is not None and revision != expected_for_doc)


class CitationValidationService:
    def validate(
        self,
        *,
        raw_output: str,
        retrieved_chunks: list[RetrievedChunk],
        allowed_document_ids: list[str] | None = None,
        expected_index_revision_ids: list[str] | None = None,
        context: CitationValidationContext | None = None,
    ) -> ValidatedAnswer:
        if context is not None and context.allowed_document_ids is not None:
            contextual_ids = context.allowed_document_ids
            allowed_document_ids = (
                contextual_ids
                if allowed_document_ids is None
                else list(set(allowed_document_ids).intersection(contextual_ids))
            )
        allowed_docs = set(allowed_document_ids) if allowed_document_ids is not None else None
        revisions, revision_by_document, require_revision = _resolve_revision_binding(
            context=context, expected_index_revision_ids=expected_index_revision_ids
        )
        if not _retrieved_revisions_consistent(
            retrieved_chunks,
            expected_revisions=revisions,
            revision_by_document=revision_by_document,
            evidence_revision_hash=context.evidence_revision_hash if context else None,
        ):
            return _rejected("revision_mismatch")

        allowed = {
            chunk.chunk_id: chunk
            for chunk in retrieved_chunks
            if _chunk_authorized(
                chunk,
                allowed_docs=allowed_docs,
                expected_revisions=revisions,
                revision_by_document=revision_by_document,
                require_revision=require_revision,
            )
        }
        unused = _unused_citations(list(allowed.values()))
        payload = _parse_structured_payload(raw_output)
        if payload is None:
            return _rejected("unstructured" if raw_output.strip() else "empty_answer", unused)
        payload.pop("answer", None)  # Legacy responses may carry a separate free form answer.
        try:
            structured = RagStructuredAnswer.model_validate(payload)
        except ValidationError:
            return _rejected("incomplete", unused)
        if structured.no_evidence and not structured.claims:
            return ValidatedAnswer(
                INSUFFICIENT_EVIDENCE_ANSWER,
                [],
                unused,
                citation_validation_status="no_evidence",
                no_evidence=True,
            )
        if not structured.claims or structured.no_evidence:
            return _rejected("missing_claims", unused)
        return _validate_supported_claims(structured, allowed, unused)


def _rejected(
    status: CitationValidationStatus, citations: list[Citation] | None = None
) -> ValidatedAnswer:
    return ValidatedAnswer("", [], citations or [], True, status)


def _validate_supported_claims(
    answer: RagStructuredAnswer, allowed: dict[str, RetrievedChunk], unused: list[Citation]
) -> ValidatedAnswer:
    source_units = {chunk_id: _source_units(chunk) for chunk_id, chunk in allowed.items()}
    numbers: dict[str, int] = {}
    quotes: dict[str, str] = {}
    claims: list[ClaimCitation] = []
    for claim in answer.claims:
        text = claim.text.strip()
        chunk_ids = list(dict.fromkeys(claim.chunk_ids))
        if any(chunk_id not in allowed for chunk_id in chunk_ids):
            return _rejected("invalid", unused)
        if not text or any(text not in source_units[chunk_id] for chunk_id in chunk_ids):
            return _rejected("unsupported_claim", unused)
        refs = [numbers.setdefault(chunk_id, len(numbers) + 1) for chunk_id in chunk_ids]
        for chunk_id in chunk_ids:
            quotes.setdefault(chunk_id, text)
        claims.append(ClaimCitation(text=text, chunk_ids=chunk_ids, citation_numbers=refs))

    citations = [
        _citation_from_chunk(
            allowed[chunk_id], citation_number=number, used_in_answer=True, quote=quotes[chunk_id]
        )
        for chunk_id, number in numbers.items()
    ]
    citations.extend(citation for citation in unused if citation.chunk_id not in numbers)
    return ValidatedAnswer("\n\n".join(claim.text for claim in claims), claims, citations)
