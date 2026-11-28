from enum import StrEnum


class DocumentStatus(StrEnum):
    UPLOADED = "uploaded"
    INDEXED = "indexed"
    FAILED = "failed"
    DELETED = "deleted"

    # Legacy values: retain for existing records/API consumers during migration.
    # New ingestion attempts track processing progress on the job instead.
    PARSING = "parsing"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"


class IngestionJobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    RETRYING = "retrying"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class IngestionStage(StrEnum):
    DOWNLOAD = "download"
    SCAN = "scan"
    PARSE = "parse"
    CHUNK = "chunk"
    EMBED = "embed"
    PERSIST = "persist"


class IngestionErrorCode(StrEnum):
    INDEXING_FAILED = "INDEXING_FAILED"
    DOCUMENT_INVALID = "DOCUMENT_INVALID"
    STORAGE_UNAVAILABLE = "STORAGE_UNAVAILABLE"
    SCAN_UNAVAILABLE = "SCAN_UNAVAILABLE"
    EMBEDDING_FAILED = "EMBEDDING_FAILED"
    EMBEDDING_INVALID = "EMBEDDING_INVALID"
    DATABASE_UNAVAILABLE = "DATABASE_UNAVAILABLE"
    DOCUMENT_DELETED = "DOCUMENT_DELETED"
    WORKER_LEASE_LOST = "WORKER_LEASE_LOST"
    WORKER_CANCELLED = "WORKER_CANCELLED"


class SourceType(StrEnum):
    UPLOAD = "upload"
    API = "api"
    MANUAL = "manual"


class RetrievalIntent(StrEnum):
    FACT = "fact"
    DEFINITION = "definition"
    EVIDENCE = "evidence"
    COMPARISON = "comparison"
    SYNTHESIS = "synthesis"
    CONTRADICTION = "contradiction"
    SEMANTIC_SEARCH = "semantic_search"


class MessageRole(StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
