from __future__ import annotations

import asyncio
import json
import logging
import math
from collections.abc import AsyncIterator, Awaitable, Callable
from datetime import datetime
from typing import TypedDict, TypeVar
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.storage import ObjectStorageError, StorageNotConfiguredError
from backend.lib.project_access import ProjectAccessPort, SqlAlchemyProjectAccessPort
from backend.lib.retrieval_cache import invalidate_retrieval_cache_for_document
from backend.modules.rag.application.chunking_service import ChunkingService
from backend.modules.rag.application.document_parser_service import DocumentParserService
from backend.modules.rag.application.embedding_service import EmbeddingService
from backend.modules.rag.application.rag_policy_service import RagPolicyService
from backend.modules.rag.domain.enums import (
    DocumentStatus,
    IngestionErrorCode,
    IngestionJobStatus,
    IngestionStage,
)
from backend.modules.rag.domain.models import DocumentChunk, ParsedDocument
from backend.modules.rag.infrastructure import metrics
from backend.modules.rag.infrastructure.document_safety import DocumentSafetyService
from backend.modules.rag.infrastructure.file_storage_adapter import (
    EmptyUploadError,
    FileStorageAdapter,
    FileTooLargeError,
    StoredDocument,
)
from backend.modules.rag.infrastructure.pgvector_adapter import build_vector_store
from backend.modules.rag.infrastructure.rag_config import RagConfig
from backend.modules.rag.infrastructure.repositories import RagRepository
from backend.modules.rag.workers import queue_document_cleanup, queue_document_indexing

logger = logging.getLogger(__name__)

_T = TypeVar("_T")
_HEARTBEAT_SECONDS = 30
_LEASE_SECONDS = 120


class IngestionAttemptArgs(TypedDict):
    document_id: str
    job_id: str
    started_at: datetime


def _validate_parsed_document_limits(parsed: list[ParsedDocument], config: RagConfig) -> None:
    if len(parsed) > config.max_ingestion_chunks:
        raise ValueError("Document exceeds the parsed-unit limit")
    page_numbers = {
        page
        for document in parsed
        if isinstance((page := document.page_number or document.metadata.get("page_number")), int)
        and not isinstance(page, bool)
    }
    if len(page_numbers) > config.max_document_pages:
        raise ValueError("Document exceeds the page limit")
    if sum(len(document.content) for document in parsed) > config.max_document_characters:
        raise ValueError("Document exceeds the parsed character limit")


class IngestionAttemptLost(RuntimeError):
    """The document was deleted or a newer worker owns the job."""


class DocumentIngestionService:
    def __init__(self, db: AsyncSession, config: RagConfig | None = None):
        self.db = db
        self.config = config or RagConfig.from_settings()
        self.repo = RagRepository(db)
        self.project_access: ProjectAccessPort = SqlAlchemyProjectAccessPort(db)
        self.parser = DocumentParserService(self.config)
        self.safety = DocumentSafetyService(self.config)
        self.chunker = ChunkingService(self.config)
        self.embeddings = EmbeddingService(self.config)
        self.policy = RagPolicyService()
        self.storage = FileStorageAdapter()
        self.vector_store = build_vector_store(db, self.config)

    async def upload_document(
        self,
        *,
        user_id: str,
        filename: str,
        content: bytes | None = None,
        content_type: str,
        project_id: str | None = None,
        organization_id: str | None = None,
        metadata: dict | None = None,
        upload: UploadFile | None = None,
    ):
        """Upload a document from bytes or a streamed ``UploadFile``.

        Prefer ``upload=`` for HTTP multipart so the whole body is not buffered
        before size enforcement. ``content=`` remains for small in-memory text.
        """
        if not self.config.enabled:
            raise HTTPException(status_code=503, detail="RAG is disabled")

        if content is None and upload is None:
            raise HTTPException(status_code=400, detail="No file content provided")
        if content is not None and upload is not None:
            raise HTTPException(
                status_code=400,
                detail="Provide either content or upload, not both",
            )

        if not self.policy.is_allowed_file_type(filename, self.config.allowed_file_types):
            raise HTTPException(status_code=400, detail="Unsupported file type")

        if project_id:
            await self._ensure_project_access(user_id, project_id)

        async def _dedupe_lookup(checksum: str) -> StoredDocument | None:
            existing = await self.repo.find_document_by_checksum(
                user_id=user_id,
                checksum_sha256=checksum,
                project_id=project_id,
            )
            if existing is None or not existing.storage_path:
                return None
            meta = json.loads(existing.metadata_json or "{}")
            return StoredDocument(
                storage_path=existing.storage_path,
                size_bytes=int(meta.get("size_bytes") or 0),
                checksum_sha256=checksum,
                content_type=existing.content_type,
                reused_existing=True,
            )

        try:
            if upload is not None:
                stored = await self._store_upload_stream(
                    user_id=user_id,
                    filename=filename,
                    content_type=content_type,
                    upload=upload,
                    dedupe_lookup=_dedupe_lookup,
                )
            else:
                if content is None:
                    raise HTTPException(status_code=400, detail="Uploaded document file is empty")
                if len(content) > self.config.max_file_bytes:
                    raise HTTPException(status_code=413, detail="File too large")
                if not content:
                    raise HTTPException(status_code=400, detail="Uploaded document file is empty")
                stored = await self.storage.store_document(
                    user_id=user_id,
                    filename=filename,
                    content=content,
                    content_type=content_type,
                    max_bytes=self.config.max_file_bytes,
                    dedupe_lookup=_dedupe_lookup,
                )
        except FileTooLargeError as exc:
            raise HTTPException(status_code=413, detail="File too large") from exc
        except EmptyUploadError as exc:
            raise HTTPException(status_code=400, detail="Uploaded document file is empty") from exc
        except StorageNotConfiguredError as exc:
            raise HTTPException(status_code=503, detail="Object storage is not configured") from exc
        except ObjectStorageError as exc:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Object storage unavailable. Start MinIO "
                    "(`docker compose -f infra/docker-compose.yml up -d minio`) "
                    "and confirm STORAGE_* credentials match MINIO_ROOT_*."
                ),
            ) from exc

        if stored.reused_existing:
            document = await self.repo.find_document_by_checksum(
                user_id=user_id,
                checksum_sha256=stored.checksum_sha256,
                project_id=project_id,
            )
            if document is None:
                raise HTTPException(status_code=500, detail="Duplicate document lookup failed")
            document = await self.repo.get_document(document.id, for_update=True)
            if document is None:
                await self.db.rollback()
                raise HTTPException(status_code=409, detail="Document changed; retry upload")
            active_job = await self.repo.get_active_ingestion_job(document.id)
            if active_job:
                await self.db.commit()
                await self.db.refresh(document)
                await self.db.refresh(active_job)
                return document, active_job, None
            job = await self.repo.create_ingestion_job(
                document_id=document.id,
                user_id=user_id,
                project_id=project_id,
            )
            await self.db.commit()
            await self.db.refresh(document)
            await self.db.refresh(job)
            return document, job, None

        document_metadata = {
            "size_bytes": stored.size_bytes,
            "checksum_sha256": stored.checksum_sha256,
            "content_type": stored.content_type,
            "storage_key": stored.storage_path,
            **(metadata or {}),
        }
        # Prefer measured size/checksum over caller overrides.
        document_metadata["size_bytes"] = stored.size_bytes
        document_metadata["checksum_sha256"] = stored.checksum_sha256
        document_metadata["storage_key"] = stored.storage_path

        document = await self.repo.create_document(
            user_id=user_id,
            filename=filename,
            original_filename=filename,
            content_type=content_type,
            storage_path=stored.storage_path,
            project_id=project_id,
            organization_id=organization_id,
            source_type="upload",
            metadata=document_metadata,
        )
        job = await self.repo.create_ingestion_job(
            document_id=document.id,
            user_id=user_id,
            project_id=project_id,
        )
        await self.db.commit()
        await self.db.refresh(document)
        await self.db.refresh(job)
        metrics.rag_document_upload_total.inc()

        # Content is not kept in memory after streaming; callers download from storage.
        return document, job, None

    async def _store_upload_stream(
        self,
        *,
        user_id: str,
        filename: str,
        content_type: str,
        upload: UploadFile,
        dedupe_lookup: Callable[[str], Awaitable[StoredDocument | None]] | None = None,
    ) -> StoredDocument:
        chunk_size = max(8 * 1024, int(getattr(settings, "RAG_UPLOAD_CHUNK_SIZE", 256 * 1024)))

        async def _chunks() -> AsyncIterator[bytes]:
            while True:
                chunk = await upload.read(chunk_size)
                if not chunk:
                    break
                yield chunk

        return await self.storage.store_document_stream(
            user_id=user_id,
            filename=filename,
            content_type=content_type,
            chunks=_chunks(),
            max_bytes=self.config.max_file_bytes,
            chunk_size=chunk_size,
            dedupe_lookup=dedupe_lookup,
        )

    async def enqueue_document_indexing(
        self,
        *,
        document_id: str,
        user_id: str,
        file_content: bytes | None = None,
        is_admin: bool = False,
    ):
        # Lock the document before creating or inspecting its active job.
        try:
            document = await self._get_document_for_indexing(
                document_id=document_id,
                user_id=user_id,
                is_admin=is_admin,
                for_update=True,
            )
            job = await self.repo.get_active_ingestion_job(document.id)
            if job is None:
                try:
                    async with self.db.begin_nested():
                        job = await self.repo.create_ingestion_job(
                            document_id=document.id,
                            user_id=document.user_id,
                            project_id=document.project_id,
                        )
                except IntegrityError:
                    job = await self.repo.get_active_ingestion_job(document.id)
                    if job is None:
                        raise
            owner_id, queued_job_id = document.user_id, job.id
            should_dispatch = (
                job.status == IngestionJobStatus.PENDING.value
                or self.repo.is_ingestion_job_expired(job, lease_seconds=_LEASE_SECONDS)
            )
            await self.db.commit()
        except BaseException:
            await self.db.rollback()
            raise

        # Dispatch is deliberately outside the DB transaction. A durable
        # outbox dispatcher is needed to close the commit-to-publish gap.
        if should_dispatch:
            queue_document_indexing(
                document_id=document_id,
                user_id=owner_id,
                job_id=queued_job_id,
            )
        await self.db.refresh(job)
        return job

    async def _record_ingestion_failure(
        self,
        *,
        document_id: str,
        job_id: str,
        started_at: datetime,
        error_code: IngestionErrorCode,
    ) -> bool:
        """Rollback first, then record a sanitized failure in a fresh transaction.

        Return True if an ambiguous final commit actually completed the job.
        Never let a stale worker overwrite a newer attempt or deleted document.
        """
        try:
            await self.db.rollback()
            attempt = await self.repo.lock_ingestion_attempt(
                document_id=document_id,
                job_id=job_id,
                started_at=started_at,
            )
            if attempt is None:
                job = await self.repo.get_ingestion_job(job_id, for_update=True)
                completed = bool(
                    job is not None
                    and job.document_id == document_id
                    and job.started_at == started_at
                    and job.status == IngestionJobStatus.COMPLETED.value
                )
                await self.db.rollback()
                return completed
            document, job = attempt
            await self.repo.update_document_status(
                document,
                DocumentStatus.INDEXED
                if await self.repo.has_published_content(document)
                else DocumentStatus.FAILED,
            )
            await self.repo.update_ingestion_job(
                job,
                status=IngestionJobStatus.FAILED,
                finished=True,
                error_code=error_code.value,
                error_message="Document indexing failed. Check the error code for details.",
            )
            await self.db.commit()
            return False
        except Exception:
            try:
                await self.db.rollback()
            except Exception:
                logger.error("Unable to roll back ingestion failure transaction")
            logger.error(
                "Unable to persist ingestion failure document=%s job=%s",
                document_id,
                job_id,
            )
            # Redelivery/recovery must reclaim the expired attempt.
            return False

    async def _update_ingestion_progress(
        self,
        *,
        document_id: str,
        job_id: str,
        started_at: datetime,
        progress: int | None = None,
        malware_scan_status: str | None = None,
    ) -> None:
        try:
            attempt = await self.repo.lock_ingestion_attempt(
                document_id=document_id,
                job_id=job_id,
                started_at=started_at,
            )
            if attempt is None:
                raise IngestionAttemptLost()
            _, job = attempt
            await self.repo.update_ingestion_job(
                job,
                status=IngestionJobStatus.RUNNING,
                progress_percent=progress,
                malware_scan_status=malware_scan_status,
            )
            await self.db.commit()
        except BaseException:
            await self.db.rollback()
            raise

    async def _with_heartbeat(
        self,
        operation: Awaitable[_T],
        *,
        document_id: str,
        job_id: str,
        started_at: datetime,
    ) -> _T:
        """Run external work without a DB transaction; renew the attempt periodically.

        The operation must not use this AsyncSession concurrently.
        """
        task = asyncio.ensure_future(operation)
        try:
            while True:
                done, _ = await asyncio.wait({task}, timeout=_HEARTBEAT_SECONDS)
                if done:
                    return task.result()
                await self._update_ingestion_progress(
                    document_id=document_id,
                    job_id=job_id,
                    started_at=started_at,
                )
        finally:
            if not task.done():
                task.cancel()
            await asyncio.gather(task, return_exceptions=True)

    async def _embed_retrieval_chunks(
        self,
        chunks: list[DocumentChunk],
        *,
        attempt_args: IngestionAttemptArgs,
    ) -> None:
        batch_size = max(1, int(settings.RAG_EMBEDDING_BATCH_SIZE))
        dimensions = getattr(self.config, "embedding_dimensions", None)
        for start in range(0, len(chunks), batch_size):
            batch = chunks[start : start + batch_size]
            vectors = await self._with_heartbeat(
                self.embeddings.embed_texts([chunk.content for chunk in batch]),
                **attempt_args,
            )
            if len(vectors) != len(batch) or any(
                not vector
                or (dimensions is not None and len(vector) != dimensions)
                or any(not math.isfinite(value) for value in vector)
                for vector in vectors
            ):
                raise ValueError("Invalid embedding count, dimension or numeric value")
            for chunk, vector in zip(batch, vectors, strict=True):
                chunk.embedding = vector

    async def _invalidate_cache(self, *, user_id: str, project_id: str | None) -> None:
        # Post-commit work cannot change the durable ingestion outcome.
        # Durable retry and revision-aware cache keys are a separate integration.
        try:
            await invalidate_retrieval_cache_for_document(user_id=user_id, project_id=project_id)
        except Exception:
            logger.warning("RAG cache invalidation failed user=%s project=%s", user_id, project_id)

    async def index_document(
        self,
        *,
        document_id: str,
        user_id: str,
        file_content: bytes | None = None,
        is_admin: bool = False,
        job_id: str | None = None,
    ):
        if not self.config.enabled:
            raise HTTPException(status_code=503, detail="RAG is disabled")

        # Claim and snapshot in a short transaction; no ORM reads during I/O.
        try:
            document = await self._get_document_for_indexing(
                document_id=document_id,
                user_id=user_id,
                is_admin=is_admin,
                for_update=True,
            )
            if job_id is not None:
                job = await self.repo.get_ingestion_job(job_id, for_update=True)
                if (
                    job is None
                    or job.document_id != document.id
                    or job.user_id != document.user_id
                    or job.project_id != document.project_id
                ):
                    raise HTTPException(status_code=404, detail="Ingestion job not found")
            else:
                job = await self.repo.get_active_ingestion_job(document.id)
                if job is None:
                    job = await self.repo.create_ingestion_job(
                        document_id=document.id,
                        user_id=document.user_id,
                        project_id=document.project_id,
                    )
            job_id = job.id
            if not await self.repo.claim_ingestion_job(job_id, lease_seconds=_LEASE_SECONDS):
                await self.db.commit()
                await self.db.refresh(document)
                await self.db.refresh(job)
                return document, [], job
            # Refresh to obtain the exact timestamp stored by the database.
            await self.db.refresh(job)
            started_at = job.started_at
            if started_at is None:
                raise RuntimeError("Claimed ingestion job has no attempt timestamp")
            owner_id, project_id = document.user_id, document.project_id
            organization_id = document.organization_id
            filename, content_type = document.original_filename, document.content_type
            storage_path = document.storage_path
            document_metadata = json.loads(document.metadata_json or "{}")
            if await self.repo.has_published_content(document):
                await self.repo.update_document_status(document, DocumentStatus.INDEXED)
            else:
                await self.repo.update_document_status(document, DocumentStatus.UPLOADED)
            await self.db.commit()
        except BaseException:
            await self.db.rollback()
            raise

        attempt_args: IngestionAttemptArgs = {
            "document_id": document_id,
            "job_id": job_id,
            "started_at": started_at,
        }
        revision_id = str(uuid4())
        stage = IngestionStage.DOWNLOAD
        chunk_ids: list[str] = []
        try:
            content = file_content
            if content is None and storage_path:
                content = await self._with_heartbeat(
                    self.storage.download_document(storage_path),
                    **attempt_args,
                )
            if not content or len(content) > self.config.max_file_bytes:
                raise HTTPException(status_code=422, detail="Invalid document content")

            stage = IngestionStage.SCAN
            scan_result = await self._with_heartbeat(
                self.safety.scan(content, filename=filename),
                **attempt_args,
            )
            scan_status = str(scan_result.status)
            if scan_status == "infected":
                raise ValueError("Document rejected by malware scanner")
            if scan_status not in {"clean", "not_configured"} or (
                self.config.malware_scan_required and scan_status != "clean"
            ):
                raise RuntimeError("Malware scan unavailable")
            await self._update_ingestion_progress(
                **attempt_args,
                progress=10,
                malware_scan_status=scan_status,
            )

            stage = IngestionStage.PARSE
            parsed = await self._with_heartbeat(
                self.parser.parse_bytes(
                    content=content,
                    filename=filename,
                    content_type=content_type,
                    metadata={
                        "document_id": document_id,
                        "document_revision_id": revision_id,
                    },
                ),
                **attempt_args,
            )
            if not parsed:
                raise ValueError("No text extracted from document")
            _validate_parsed_document_limits(parsed, self.config)
            metrics.rag_parse_success_total.inc()
            await self._update_ingestion_progress(**attempt_args, progress=30)

            stage = IngestionStage.CHUNK
            chunks = await self._with_heartbeat(
                self.chunker.chunk(
                    parsed,
                    document_id=document_id,
                    user_id=owner_id,
                    filename=filename,
                    project_id=project_id,
                    organization_id=organization_id,
                    document_revision=revision_id,
                ),
                **attempt_args,
            )
            for chunk in chunks:
                if self.policy.contains_prompt_injection(chunk.content):
                    chunk.metadata = {**(chunk.metadata or {}), "prompt_injection_suspected": True}
                chunk.embedding = None
            metrics.rag_chunk_count.observe(len(chunks))
            retrieval_chunks = [
                chunk
                for chunk in chunks
                if chunk.chunk_index >= 0 and (chunk.metadata or {}).get("chunk_role") != "parent"
            ]
            if not retrieval_chunks:
                raise ValueError("No searchable chunks extracted")
            if len(chunks) > self.config.max_ingestion_chunks:
                raise ValueError("Document exceeds the chunk limit")
            await self._update_ingestion_progress(**attempt_args, progress=50)

            stage = IngestionStage.EMBED
            dimensions = getattr(self.config, "embedding_dimensions", None)
            await self._embed_retrieval_chunks(retrieval_chunks, attempt_args=attempt_args)
            await self._update_ingestion_progress(**attempt_args, progress=75)

            stage = IngestionStage.PERSIST
            # Revision row, chunk rows, active pointer and job completion are atomic.
            attempt = await self.repo.lock_ingestion_attempt(**attempt_args)
            if attempt is None:
                raise IngestionAttemptLost()
            document, job = attempt
            index_revision = await self.repo.create_document_revision(
                document,
                revision_id=revision_id,
                source_content_hash=document_metadata.get("checksum_sha256"),
                parser_version=getattr(self.config, "parser_version", None),
                chunker_version=chunks[0].metadata.get("chunker_version"),
                index_version=getattr(self.config, "index_version", None),
                embedding_provider=getattr(self.config, "embedding_provider", None),
                embedding_model=getattr(self.config, "embedding_model", None),
                embedding_model_version=getattr(self.config, "embedding_model_version", None),
                embedding_dimensions=dimensions,
                embedding_preprocessing_version=getattr(
                    self.config, "embedding_preprocessing_version", None
                ),
            )
            chunk_rows = await self.repo.replace_chunks(
                document,
                [
                    {
                        "id": c.id,
                        "chunk_index": c.chunk_index,
                        "content": c.content,
                        "token_count": c.token_count,
                        "metadata": c.metadata,
                        "embedding": c.embedding,
                        "vector_external_id": c.id,
                        "content_hash": c.content_hash,
                        "parent_chunk_id": c.parent_chunk_id,
                        "parser_version": (c.metadata or {}).get("parser_version"),
                        "chunker_version": (c.metadata or {}).get("chunker_version"),
                    }
                    for c in chunks
                ],
                revision_id=revision_id,
                expected_embedding_dimensions=dimensions,
            )
            chunk_ids = [row.id for row in chunk_rows]
            await self.repo.activate_document_revision(document, index_revision)
            await self.repo.update_document_status(document, DocumentStatus.INDEXED)
            metadata = json.loads(document.metadata_json or "{}")
            metadata["chunk_count"] = len(chunk_rows)
            document.metadata_json = json.dumps(metadata, ensure_ascii=True)
            await self.repo.update_ingestion_job(
                job,
                status=IngestionJobStatus.COMPLETED,
                finished=True,
                progress_percent=100,
            )
            await self.db.commit()
        except IngestionAttemptLost:
            await self.db.rollback()
            raise HTTPException(
                status_code=409, detail="Ingestion attempt is no longer active"
            ) from None
        except asyncio.CancelledError:
            await self._record_ingestion_failure(
                **attempt_args,
                error_code=IngestionErrorCode.WORKER_CANCELLED,
            )
            raise
        except Exception as exc:
            if isinstance(exc, IntegrityError):
                code = IngestionErrorCode.INDEXING_FAILED
            elif isinstance(exc, SQLAlchemyError):
                code = IngestionErrorCode.DATABASE_UNAVAILABLE
            elif isinstance(exc, ValueError) and stage == IngestionStage.EMBED:
                code = IngestionErrorCode.EMBEDDING_INVALID
            elif isinstance(exc, (ValueError, HTTPException)):
                code = IngestionErrorCode.DOCUMENT_INVALID
            elif stage == IngestionStage.DOWNLOAD:
                code = IngestionErrorCode.STORAGE_UNAVAILABLE
            elif stage == IngestionStage.SCAN:
                code = IngestionErrorCode.SCAN_UNAVAILABLE
            elif stage == IngestionStage.EMBED:
                code = IngestionErrorCode.EMBEDDING_FAILED
            else:
                code = IngestionErrorCode.INDEXING_FAILED
            logger.warning(
                "RAG ingestion failed document=%s job=%s stage=%s code=%s type=%s",
                document_id,
                job_id,
                stage.value,
                code.value,
                type(exc).__name__,
            )
            if stage == IngestionStage.PARSE:
                metrics.rag_parse_failure_total.inc()
            elif stage == IngestionStage.PERSIST:
                metrics.rag_vector_upsert_failure_total.inc()
            completed = await self._record_ingestion_failure(**attempt_args, error_code=code)
            if not completed:
                status = 422 if code == IngestionErrorCode.DOCUMENT_INVALID else 502
                raise HTTPException(status_code=status, detail="Document indexing failed") from None
            # A commit acknowledgement can fail after PostgreSQL commits.
            # The persisted completion state wins over the exception.
            document = await self.repo.get_document(document_id)
            job = await self.repo.get_ingestion_job(job_id)
            if document is None or job is None:
                raise HTTPException(
                    status_code=409, detail="Document no longer available"
                ) from None
            recovered = await self.repo.get_chunks_by_ids(chunk_ids)
            by_id = {row.id: row for row in recovered}
            chunk_rows = [by_id[chunk_id] for chunk_id in chunk_ids if chunk_id in by_id]

        # No failure handler covering these post-commit operations.
        await self._invalidate_cache(user_id=owner_id, project_id=project_id)
        await self.db.refresh(document)
        await self.db.refresh(job)
        # Support expire_on_commit=True as well as the production session factory.
        if self.db.sync_session.expire_on_commit:
            for row in chunk_rows:
                await self.db.refresh(row)
        return document, chunk_rows, job

    async def delete_document(self, *, document_id: str, user_id: str, is_admin: bool = False):
        try:
            document = await self.repo.get_document(document_id, for_update=True)
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")
            if document.user_id != user_id and not is_admin:
                metrics.rag_permission_denied_total.inc()
                raise HTTPException(status_code=403, detail="You cannot delete this document")
            if document.project_id and not is_admin:
                await self._ensure_project_access(user_id, document.project_id)
            owner_id, project_id, storage_path = (
                document.user_id,
                document.project_id,
                document.storage_path,
            )
            await self.repo.soft_delete_document(document)
            await self.repo.cancel_active_ingestion_jobs(document_id)
            await self.db.commit()
        except BaseException:
            await self.db.rollback()
            raise
        await self._invalidate_cache(user_id=owner_id, project_id=project_id)
        queue_document_cleanup(
            document_id=document_id,
            user_id=owner_id,
            storage_path=storage_path,
        )

    async def cleanup_deleted_document(
        self,
        *,
        document_id: str,
        user_id: str,
        storage_path: str | None,
    ) -> None:
        # The queue payload is not authoritative. Never delete chunks of a live
        # document or an object belonging to a different owner.
        try:
            document = await self.repo.get_document(
                document_id,
                for_update=True,
                include_deleted=True,
            )
            if document is None:
                await self.db.rollback()
                return
            if document.deleted_at is None or document.user_id != user_id:
                raise HTTPException(status_code=409, detail="Document is not eligible for cleanup")
            actual_path = document.storage_path
            if storage_path != actual_path:
                raise HTTPException(status_code=409, detail="Document storage reference changed")
            await self.vector_store.delete_document(document_id, user_id)
            delete_storage = bool(
                actual_path and not await self.repo.has_live_storage_reference(actual_path)
            )
            await self.db.commit()
        except BaseException:
            await self.db.rollback()
            raise
        if delete_storage and actual_path:
            await self.storage.delete_document(actual_path)
        logger.info("RAG document cleanup completed document=%s user=%s", document_id, user_id)

    async def _get_document_for_indexing(
        self,
        *,
        document_id: str,
        user_id: str,
        is_admin: bool,
        for_update: bool = False,
    ):
        document = await self.repo.get_document(document_id, for_update=for_update)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        if document.user_id != user_id and not is_admin:
            raise HTTPException(status_code=403, detail="You cannot index this document")
        if document.project_id:
            await self._ensure_project_access(user_id, document.project_id)
        return document

    async def _ensure_project_access(self, user_id: str, project_id: str) -> None:
        await self.project_access.ensure_project_access(user_id, project_id)
