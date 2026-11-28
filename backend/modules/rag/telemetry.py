from __future__ import annotations

from dataclasses import dataclass, field
from functools import wraps
from time import perf_counter
from uuid import uuid4

from opentelemetry import trace
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from prometheus_client import Counter, Histogram

tracer = trace.get_tracer("backend.rag")


def traced(stage: str):
    """Trace async stages without recording potentially sensitive exception text."""

    def decorate(function):
        @wraps(function)
        async def run(*args, **kwargs):
            with tracer.start_as_current_span(
                stage, record_exception=False, set_status_on_exception=False
            ) as span:
                try:
                    return await function(*args, **kwargs)
                except BaseException as exc:
                    span.set_attribute("error.type", type(exc).__name__)
                    span.set_status(trace.StatusCode.ERROR)
                    raise

        return run

    return decorate


def trace_carrier() -> dict[str, str]:
    carrier: dict[str, str] = {}
    TraceContextTextMapPropagator().inject(carrier)
    return carrier


def resume_trace(carrier: dict[str, str]):
    return tracer.start_as_current_span(
        "rag.synthesis.worker",
        context=TraceContextTextMapPropagator().extract(carrier),
        record_exception=False,
        set_status_on_exception=False,
    )


@dataclass(slots=True)
class RagTraceContext:
    request_id: str = field(default_factory=lambda: str(uuid4()))
    stage_timings_ms: dict[str, int] = field(default_factory=dict)
    branch_status: dict[str, str] = field(default_factory=dict)
    _spans: dict = field(default_factory=dict)

    def measure(self, stage: str) -> float:
        self._spans[stage] = tracer.start_span(
            f"rag.{stage}", attributes={"request_id": self.request_id}
        )
        return perf_counter()

    def complete(self, stage: str, started: float, *, status: str = "ok") -> None:
        self.stage_timings_ms[stage] = int((perf_counter() - started) * 1000)
        self.branch_status[stage] = status
        span = self._spans.pop(stage, None)
        if span is not None:
            span.set_attribute("status", status)
            span.end()

    def close(self) -> None:
        for span in self._spans.values():
            span.set_attribute("status", "interrupted")
            span.end()
        self._spans.clear()


rag_document_upload_total = Counter("rag_document_upload_total", "Document uploads")
rag_parse_success_total = Counter("rag_parse_success_total", "Successful document parses")
rag_parse_failure_total = Counter("rag_parse_failure_total", "Failed document parses")
rag_chunk_count = Histogram(
    "rag_chunk_count",
    "Chunks produced per document",
    buckets=(1, 5, 10, 25, 50, 100, 250, 500),
)
rag_embedding_latency_ms = Histogram(
    "rag_embedding_latency_ms",
    "Embedding latency in milliseconds",
    buckets=(10, 50, 100, 250, 500, 1000, 2500, 5000),
)
rag_vector_upsert_success_total = Counter("rag_vector_upsert_success_total", "Vector upserts")
rag_vector_upsert_failure_total = Counter(
    "rag_vector_upsert_failure_total",
    "Vector upsert failures",
)
rag_retrieval_latency_ms = Histogram(
    "rag_retrieval_latency_ms",
    "Retrieval latency in milliseconds",
    buckets=(5, 10, 25, 50, 100, 250, 500, 1000),
)
rag_retrieved_chunks = Histogram(
    "rag_retrieved_chunks",
    "Chunks retrieved per query",
    buckets=(0, 1, 2, 3, 5, 10, 20),
)
rag_answer_latency_ms = Histogram(
    "rag_answer_latency_ms",
    "RAG answer latency in milliseconds",
    buckets=(100, 250, 500, 1000, 2500, 5000, 10000),
)
rag_permission_denied_total = Counter("rag_permission_denied_total", "RAG permission denials")
rag_vector_unavailable_total = Counter("rag_vector_unavailable_total", "Vector store unavailable")
rag_retrieval_degraded_total = Counter(
    "rag_retrieval_degraded_total",
    "Retrieval completed in degraded mode",
)
rag_retrieval_no_match_total = Counter(
    "rag_retrieval_no_match_total",
    "Retrieval succeeded but returned no chunks above threshold",
)
rag_injection_chunks_filtered_total = Counter(
    "rag_injection_chunks_filtered_total",
    "Retrieved chunks excluded due to prompt-injection flags",
)
rag_json_fallback_total = Counter(
    "rag_json_fallback_total",
    "Retrieval queries that used JSON embedding fallback",
)
rag_rerank_latency_ms = Histogram(
    "rag_rerank_latency_ms",
    "Hybrid retrieval reranking latency in milliseconds",
    buckets=(0.1, 0.5, 1, 2, 5, 10, 25, 50),
)
rag_citation_validation_failures_total = Counter(
    "rag_citation_validation_failures_total",
    "Answers with citation validation failures",
)
rag_lexical_candidate_count = Histogram(
    "rag_lexical_candidate_count",
    "Lexical candidates per retrieval",
    buckets=(0, 1, 2, 5, 10, 20, 40, 80),
)
rag_dense_candidate_count = Histogram(
    "rag_dense_candidate_count",
    "Dense candidates per retrieval",
    buckets=(0, 1, 2, 5, 10, 20, 40, 80),
)
rag_source_coverage_ratio = Histogram(
    "rag_source_coverage_ratio",
    "Fraction of in-scope documents with retrieved evidence",
    buckets=(0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0),
)
