from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import cast

from sqlalchemy import JSON, Table, and_, delete, or_, select, update
from sqlalchemy import cast as sql_cast
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.db.vector_search import store_chunk_embeddings_batch
from backend.core.pagination import DEFAULT_PAGE_LIMIT, paginate_scalars
from backend.modules.rag.enums import DocumentStatus, IngestionErrorCode, IngestionJobStatus
from backend.modules.rag.models import (
    RagChunk,
    RagDocument,
    RagDocumentRevision,
    RagIngestionJob,
    RagQueryRecord,
    RagRetrievalTrace,
)
from backend.modules.rag.repository_scope import (
    _IN_CLAUSE_BATCH,
    _owned_document_scope,
)


class RagRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_document(
        self,
        *,
        user_id: str,
        filename: str,
        original_filename: str,
        content_type: str,
        storage_path: str | None,
        project_id: str | None,
        organization_id: str | None,
        source_type: str,
        metadata: dict | None,
    ) -> RagDocument:
        row = RagDocument(
            user_id=user_id,
            filename=filename,
            original_filename=original_filename,
            content_type=content_type,
            storage_path=storage_path,
            project_id=project_id,
            organization_id=organization_id,
            source_type=source_type,
            status=DocumentStatus.UPLOADED.value,
            metadata_json=json.dumps(metadata or {}, ensure_ascii=True),
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def get_document(
        self,
        document_id: str,
        *,
        user_id: str | None = None,
        for_update: bool = False,
        include_deleted: bool = False,
    ) -> RagDocument | None:
        stmt = select(RagDocument).where(RagDocument.id == document_id)
        if not include_deleted:
            stmt = stmt.where(RagDocument.deleted_at.is_(None))
        if user_id is not None:
            stmt = stmt.where(*_owned_document_scope(user_id))
        if for_update:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_documents_by_ids(
        self,
        document_ids: list[str],
        *,
        user_id: str | None = None,
        include_deleted: bool = False,
    ) -> list[RagDocument]:
        """Fetch documents in bounded batches; optionally scope to ``user_id``."""
        if not document_ids:
            return []
        rows: list[RagDocument] = []
        for start in range(0, len(document_ids), _IN_CLAUSE_BATCH):
            stmt = select(RagDocument).where(
                RagDocument.id.in_(document_ids[start : start + _IN_CLAUSE_BATCH])
            )
            if not include_deleted:
                stmt = stmt.where(RagDocument.deleted_at.is_(None))
            if user_id is not None:
                stmt = stmt.where(*_owned_document_scope(user_id))
            result = await self.db.execute(stmt)
            rows.extend(result.scalars().all())
        return rows

    async def find_document_by_checksum(
        self,
        *,
        user_id: str,
        checksum_sha256: str,
        project_id: str | None = None,
    ) -> RagDocument | None:
        """Return the newest non-deleted document with matching content checksum.

        Checksums are hex digests stored in ``metadata_json``; matching is scoped
        to the owning user and optional project so provenance stays isolated.
        """
        digest = checksum_sha256.strip().lower()
        if not digest or any(c not in "0123456789abcdef" for c in digest):
            return None
        needle = f'"checksum_sha256": "{digest}"'
        stmt = (
            select(RagDocument)
            .where(
                RagDocument.user_id == user_id,
                RagDocument.deleted_at.is_(None),
                RagDocument.metadata_json.contains(needle),
            )
            .order_by(RagDocument.created_at.desc())
            .limit(1)
        )
        if project_id is not None:
            stmt = stmt.where(RagDocument.project_id == project_id)
        else:
            stmt = stmt.where(RagDocument.project_id.is_(None))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_documents_for_user(
        self,
        user_id: str,
        *,
        project_id: str | None = None,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[RagDocument], int]:
        stmt = select(RagDocument).where(
            *_owned_document_scope(user_id),
            RagDocument.deleted_at.is_(None),
        )
        if project_id:
            stmt = stmt.where(RagDocument.project_id == project_id)
        stmt = stmt.order_by(RagDocument.created_at.desc())
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def filter_document_ids_for_user(
        self,
        user_id: str,
        document_ids: list[str],
        *,
        project_id: str | None = None,
    ) -> list[str]:
        if not document_ids:
            return []
        stmt = select(RagDocument.id).where(
            *_owned_document_scope(user_id),
            RagDocument.deleted_at.is_(None),
            RagDocument.id.in_(document_ids),
        )
        if project_id:
            stmt = stmt.where(RagDocument.project_id == project_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_document_status(
        self, document: RagDocument, status: DocumentStatus
    ) -> RagDocument:
        document.status = status.value
        document.updated_at = datetime.now(UTC)
        await self.db.flush()
        return document

    async def create_document_revision(
        self,
        document: RagDocument,
        *,
        source_content_hash: str | None,
        parser_version: str | None,
        chunker_version: str | None,
        index_version: str | None,
        embedding_provider: str | None,
        embedding_model: str | None,
        embedding_model_version: str | None,
        embedding_dimensions: int | None,
        embedding_preprocessing_version: str | None,
        embedding_model_id: str | None = None,
        revision_id: str | None = None,
    ) -> RagDocumentRevision:
        revision = RagDocumentRevision(
            document_id=document.id,
            source_content_hash=source_content_hash,
            parser_version=parser_version,
            chunker_version=chunker_version,
            index_version=index_version,
            embedding_provider=embedding_provider,
            embedding_model=embedding_model,
            embedding_model_version=embedding_model_version,
            embedding_dimensions=embedding_dimensions,
            embedding_preprocessing_version=embedding_preprocessing_version,
            embedding_model_id=embedding_model_id,
        )
        if revision_id is not None:
            revision.id = revision_id
        self.db.add(revision)
        await self.db.flush()
        return revision

    async def activate_document_revision(
        self, document: RagDocument, revision: RagDocumentRevision
    ) -> None:
        if document.deleted_at is not None or revision.document_id != document.id:
            raise ValueError("Invalid document revision activation")
        document.current_revision_id = revision.id
        await self.db.flush()

    async def soft_delete_document(self, document: RagDocument) -> RagDocument:
        document.status = DocumentStatus.DELETED.value
        document.deleted_at = datetime.now(UTC)
        document.updated_at = datetime.now(UTC)
        await self.db.flush()
        return document

    async def replace_chunks(
        self,
        document: RagDocument,
        chunks: list[dict],
        *,
        revision_id: str | None = None,
        expected_embedding_dimensions: int | None = None,
    ) -> list[RagChunk]:
        # Revisioned indexing appends immutable rows. Legacy callers without a
        # revision retain the original replace semantics.
        if revision_id is None:
            await self.db.execute(delete(RagChunk).where(RagChunk.document_id == document.id))
        if expected_embedding_dimensions is not None:
            invalid = [
                item.get("id") or item.get("chunk_index")
                for item in chunks
                if item.get("embedding") is not None
                and len(item["embedding"]) != expected_embedding_dimensions
            ]
            if invalid:
                raise ValueError(
                    "chunk embeddings do not match expected dimension "
                    f"{expected_embedding_dimensions}: {invalid}"
                )
        rows: list[RagChunk] = []
        for item in chunks:
            meta = item.get("metadata") or {}
            embedding = item.get("embedding")
            row = RagChunk(
                document_id=document.id,
                user_id=document.user_id,
                organization_id=document.organization_id,
                project_id=document.project_id,
                chunk_index=item["chunk_index"],
                content=item["content"],
                token_count=item["token_count"],
                metadata_json=json.dumps(meta, ensure_ascii=True),
                embedding_json=(
                    json.dumps(embedding, ensure_ascii=True) if embedding is not None else None
                ),
                vector_external_id=item.get("vector_external_id"),
                content_hash=item.get("content_hash"),
                parent_chunk_id=item.get("parent_chunk_id"),
                parser_version=item.get("parser_version")
                or (meta.get("parser_version") if isinstance(meta, dict) else None),
                chunker_version=item.get("chunker_version")
                or (meta.get("chunker_version") if isinstance(meta, dict) else None),
                revision_id=revision_id,
            )
            if item.get("id"):
                row.id = item["id"]
            self.db.add(row)
            rows.append(row)
        await self.db.flush()
        await store_chunk_embeddings_batch(
            self.db,
            table=cast(Table, RagChunk.__table__),
            items=[
                (row.id, item.get("embedding") or [])
                for row, item in zip(rows, chunks, strict=True)
            ],
        )
        await self.db.flush()
        return rows

    async def has_live_storage_reference(self, storage_path: str) -> bool:
        result = await self.db.execute(
            select(RagDocument.id)
            .where(
                RagDocument.storage_path == storage_path,
                RagDocument.deleted_at.is_(None),
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def delete_chunks_for_document(self, document_id: str) -> None:
        await self.db.execute(delete(RagChunk).where(RagChunk.document_id == document_id))

    async def list_evidence_revision_chunks(
        self,
        document_ids: list[str],
        *,
        revision_ids: list[str] | None = None,
    ) -> list[RagChunk]:
        """Return indexed chunk identity fields for a reproducibility hash."""
        if not document_ids:
            return []
        rows: list[RagChunk] = []
        for start in range(0, len(document_ids), _IN_CLAUSE_BATCH):
            statement = (
                select(RagChunk)
                .join(RagDocument, RagDocument.id == RagChunk.document_id)
                .where(RagChunk.document_id.in_(document_ids[start : start + _IN_CLAUSE_BATCH]))
            )
            if revision_ids is None:
                statement = statement.where(
                    (RagChunk.revision_id == RagDocument.current_revision_id)
                    | (RagDocument.current_revision_id.is_(None) & RagChunk.revision_id.is_(None))
                )
            else:
                statement = statement.where(RagChunk.revision_id.in_(revision_ids))
            result = await self.db.execute(
                statement.order_by(RagChunk.document_id, RagChunk.chunk_index, RagChunk.id)
            )
            rows.extend(result.scalars().all())
        return rows

    async def list_current_revision_ids(self, document_ids: list[str] | None) -> list[str]:
        if not document_ids:
            return []
        result = await self.db.execute(
            select(RagDocument.current_revision_id).where(
                RagDocument.id.in_(document_ids),
                RagDocument.current_revision_id.is_not(None),
            )
        )
        return list(
            dict.fromkeys(
                revision_id for revision_id in result.scalars().all() if revision_id is not None
            )
        )

    async def list_preview_revisions(
        self, *, user_id: str, project_id: str | None, document_ids: list[str] | None
    ) -> list[tuple[str, str]]:
        if document_ids == []:
            return []
        statement = select(RagDocument.id, RagDocument.current_revision_id).where(
            *_owned_document_scope(user_id),
            RagDocument.deleted_at.is_(None),
            RagDocument.status == DocumentStatus.INDEXED.value,
            RagDocument.current_revision_id.is_not(None),
        )
        if project_id is not None:
            statement = statement.where(RagDocument.project_id == project_id)
        if document_ids is not None:
            statement = statement.where(RagDocument.id.in_(document_ids))
        result = await self.db.execute(statement.order_by(RagDocument.id).limit(501))
        return [(document_id, revision) for document_id, revision in result if revision is not None]

    async def list_chunks_for_document(
        self,
        document_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[RagChunk], int]:
        stmt = (
            select(RagChunk)
            .join(RagDocument, RagDocument.id == RagChunk.document_id)
            .where(
                RagChunk.document_id == document_id,
                (RagChunk.revision_id == RagDocument.current_revision_id)
                | (RagDocument.current_revision_id.is_(None) & RagChunk.revision_id.is_(None)),
            )
            .order_by(RagChunk.chunk_index)
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def create_ingestion_job(
        self,
        *,
        document_id: str,
        user_id: str,
        project_id: str | None,
        idempotency_key: str | None = None,
    ) -> RagIngestionJob:
        job = RagIngestionJob(
            document_id=document_id,
            user_id=user_id,
            project_id=project_id,
            status=IngestionJobStatus.PENDING.value,
            idempotency_key=idempotency_key,
        )
        self.db.add(job)
        await self.db.flush()
        return job

    async def get_ingestion_job(
        self, job_id: str, *, for_update: bool = False
    ) -> RagIngestionJob | None:
        stmt = select(RagIngestionJob).where(RagIngestionJob.id == job_id)
        if for_update:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_ingestion_job(self, document_id: str) -> RagIngestionJob | None:
        result = await self.db.execute(
            select(RagIngestionJob)
            .where(
                RagIngestionJob.document_id == document_id,
                RagIngestionJob.status.in_(
                    [IngestionJobStatus.PENDING.value, IngestionJobStatus.RUNNING.value]
                ),
            )
            .order_by(RagIngestionJob.created_at.desc(), RagIngestionJob.id.desc())
            .limit(1)
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_latest_ingestion_job(self, document_id: str) -> RagIngestionJob | None:
        result = await self.db.execute(
            select(RagIngestionJob)
            .where(RagIngestionJob.document_id == document_id)
            .order_by(RagIngestionJob.created_at.desc(), RagIngestionJob.id.desc())
            .limit(1)
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def has_published_content(self, document: RagDocument) -> bool:
        if document.current_revision_id or document.status == DocumentStatus.INDEXED.value:
            return True
        # Legacy documents may have searchable chunks without a revision ID.
        result = await self.db.execute(
            select(RagChunk.id)
            .where(RagChunk.document_id == document.id, RagChunk.revision_id.is_(None))
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    @staticmethod
    def is_ingestion_job_expired(job: RagIngestionJob, *, lease_seconds: int = 120) -> bool:
        if job.status != IngestionJobStatus.RUNNING.value:
            return False
        heartbeat = job.last_heartbeat_at or job.started_at or job.created_at
        if heartbeat.tzinfo is None:
            heartbeat = heartbeat.replace(tzinfo=UTC)
        return heartbeat <= datetime.now(UTC) - timedelta(seconds=lease_seconds)

    async def claim_ingestion_job(self, job_id: str, *, lease_seconds: int = 120) -> bool:
        """Claim under document->job lock order; started_at fences each attempt.

        Reclaim expired jobs on redelivery. A separate scheduler is needed to
        redispatch abandoned jobs that never receive another delivery.
        """
        job = await self.get_ingestion_job(job_id)
        if job is None:
            return False
        document = await self.get_document(job.document_id, for_update=True)
        if document is None:
            return False
        job = await self.get_ingestion_job(job_id, for_update=True)
        if job is None:
            return False
        latest = await self.get_latest_ingestion_job(document.id)
        if latest is None or latest.id != job.id:
            return False
        if job.project_id != document.project_id or job.user_id != document.user_id:
            return False
        now = datetime.now(UTC)
        if job.status == IngestionJobStatus.RUNNING.value:
            if not self.is_ingestion_job_expired(job, lease_seconds=lease_seconds):
                return False
        elif job.status == IngestionJobStatus.FAILED.value:
            if job.error_code not in {
                IngestionErrorCode.STORAGE_UNAVAILABLE.value,
                IngestionErrorCode.SCAN_UNAVAILABLE.value,
                IngestionErrorCode.EMBEDDING_FAILED.value,
                IngestionErrorCode.DATABASE_UNAVAILABLE.value,
                IngestionErrorCode.WORKER_CANCELLED.value,
            }:
                return False
        elif job.status != IngestionJobStatus.PENDING.value:
            return False
        if job.status != IngestionJobStatus.PENDING.value:
            if job.retry_count >= job.max_retries:
                if job.status == IngestionJobStatus.RUNNING.value:
                    await self.update_ingestion_job(
                        job,
                        status=IngestionJobStatus.FAILED,
                        finished=True,
                        error_code=IngestionErrorCode.WORKER_LEASE_LOST.value,
                        error_message="Indexing worker expired; retry limit reached.",
                    )
                    await self.update_document_status(
                        document,
                        DocumentStatus.INDEXED
                        if await self.has_published_content(document)
                        else DocumentStatus.FAILED,
                    )
                return False
            job.retry_count += 1
        job.status = IngestionJobStatus.RUNNING.value
        # Preserve a distinct fencing value even if the local clock moves back.
        previous_start = job.started_at
        if previous_start is not None:
            if previous_start.tzinfo is None:
                previous_start = previous_start.replace(tzinfo=UTC)
            now = max(now, previous_start + timedelta(microseconds=1))
        job.started_at = now
        job.last_heartbeat_at = now
        job.finished_at = None
        job.error_code = None
        job.error_message = None
        job.progress_percent = 0
        job.malware_scan_status = "pending"
        await self.db.flush()
        return True

    async def lock_ingestion_attempt(
        self, *, document_id: str, job_id: str, started_at: datetime
    ) -> tuple[RagDocument, RagIngestionJob] | None:
        """Lock and reload the current attempt before any state mutation."""
        document = await self.get_document(document_id, for_update=True)
        if document is None:
            return None
        job = await self.get_ingestion_job(job_id, for_update=True)
        if (
            job is None
            or job.document_id != document.id
            or job.user_id != document.user_id
            or job.project_id != document.project_id
            or job.status != IngestionJobStatus.RUNNING.value
            or job.started_at != started_at
        ):
            return None
        latest = await self.get_latest_ingestion_job(document.id)
        if latest is None or latest.id != job.id:
            return None
        return document, job

    async def cancel_active_ingestion_jobs(self, document_id: str) -> None:
        await self.db.execute(
            update(RagIngestionJob)
            .where(
                RagIngestionJob.document_id == document_id,
                RagIngestionJob.status.in_(
                    [
                        IngestionJobStatus.PENDING.value,
                        IngestionJobStatus.RUNNING.value,
                    ]
                ),
            )
            .values(
                status=IngestionJobStatus.CANCELLED.value,
                finished_at=datetime.now(UTC),
                error_code=IngestionErrorCode.DOCUMENT_DELETED.value,
                error_message="Document deleted.",
            )
        )

    async def update_ingestion_job(
        self,
        job: RagIngestionJob,
        *,
        status: IngestionJobStatus,
        error_message: str | None = None,
        started: bool = False,
        finished: bool = False,
        progress_percent: int | None = None,
        retry_count: int | None = None,
        error_code: str | None = None,
        malware_scan_status: str | None = None,
    ) -> RagIngestionJob:
        job.status = status.value
        if error_message is not None:
            job.error_message = error_message
        if started:
            job.started_at = datetime.now(UTC)
        if finished:
            job.finished_at = datetime.now(UTC)
        if progress_percent is not None:
            job.progress_percent = max(0, min(100, progress_percent))
        if retry_count is not None:
            job.retry_count = max(0, retry_count)
        if error_code is not None:
            job.error_code = error_code
        if malware_scan_status is not None:
            job.malware_scan_status = malware_scan_status
        job.last_heartbeat_at = datetime.now(UTC)
        await self.db.flush()
        return job

    async def create_query_record(
        self,
        *,
        user_id: str,
        project_id: str | None,
        organization_id: str | None,
        query: str,
        answer: str,
        retrieved_chunk_ids: list[str],
        model_name: str,
        latency_ms: int,
    ) -> RagQueryRecord:
        row = RagQueryRecord(
            user_id=user_id,
            project_id=project_id,
            organization_id=organization_id,
            query=query,
            answer=answer,
            retrieved_chunk_ids_json=json.dumps(retrieved_chunk_ids, ensure_ascii=True),
            model_name=model_name,
            latency_ms=latency_ms,
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def list_queries_for_user(
        self,
        user_id: str,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[RagQueryRecord], int]:
        stmt = (
            select(RagQueryRecord)
            .where(RagQueryRecord.user_id == user_id)
            .order_by(RagQueryRecord.created_at.desc())
        )
        return await paginate_scalars(self.db, stmt, limit=limit, offset=offset)

    async def create_retrieval_trace(
        self,
        *,
        user_id: str,
        project_id: str | None,
        conversation_id: str | None,
        query: str,
        intent: str | None,
        scope_hash: str | None,
        evidence_revision_hash: str | None = None,
        index_revision_ids: list[str] | None = None,
        document_ids: list[str] | None,
        retrieved_chunks: list[dict],
        coverage: dict | None,
        config: dict | None,
        degraded: bool,
        degradation_reason: str | None,
        no_matches: bool,
        injection_chunks_filtered: int,
        latency_ms: int,
        request_id: str | None = None,
        stage_timings: dict | None = None,
        branch_status: dict | None = None,
    ) -> RagRetrievalTrace:
        row = RagRetrievalTrace(
            user_id=user_id,
            project_id=project_id,
            conversation_id=conversation_id,
            query=query,
            request_id=request_id,
            intent=intent,
            scope_hash=scope_hash,
            evidence_revision_hash=evidence_revision_hash,
            index_revision_ids_json=json.dumps(index_revision_ids or [], ensure_ascii=True),
            document_ids_json=json.dumps(document_ids, ensure_ascii=True)
            if document_ids is not None
            else None,
            retrieved_chunks_json=json.dumps(retrieved_chunks, ensure_ascii=True),
            coverage_json=json.dumps(coverage or {}, ensure_ascii=True),
            config_json=json.dumps(config or {}, ensure_ascii=True),
            degraded=degraded,
            degradation_reason=degradation_reason,
            no_matches=no_matches,
            injection_chunks_filtered=injection_chunks_filtered,
            latency_ms=latency_ms,
            stage_timings_json=json.dumps(stage_timings or {}, ensure_ascii=True),
            branch_status_json=json.dumps(branch_status or {}, ensure_ascii=True),
        )
        self.db.add(row)
        await self.db.flush()
        return row

    async def record_context_selection(
        self, trace_id: str, *, user_id: str, selection: dict
    ) -> None:
        result = await self.db.execute(
            select(RagRetrievalTrace).where(
                RagRetrievalTrace.id == trace_id,
                RagRetrievalTrace.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise ValueError("retrieval_trace_unavailable")
        config = json.loads(row.config_json or "{}")
        config["context_selection"] = selection
        row.config_json = json.dumps(config, ensure_ascii=True)
        await self.db.flush()

    async def get_chunks_by_ids(self, chunk_ids: list[str]) -> list[RagChunk]:
        if not chunk_ids:
            return []
        result = await self.db.execute(select(RagChunk).where(RagChunk.id.in_(chunk_ids)))
        return list(result.scalars().all())

    async def get_chunks_by_ids_for_scope(
        self,
        chunk_ids: list[str],
        *,
        user_id: str,
        project_id: str | None,
        document_ids: list[str] | None,
        current_only: bool = False,
    ) -> list[RagChunk]:
        if not chunk_ids or document_ids == []:
            return []
        stmt = (
            select(RagChunk)
            .join(RagDocument, RagDocument.id == RagChunk.document_id)
            .where(
                RagChunk.id.in_(chunk_ids),
                *_owned_document_scope(user_id),
                RagDocument.deleted_at.is_(None),
            )
        )
        if project_id is not None:
            stmt = stmt.where(RagDocument.project_id == project_id)
        if document_ids is not None:
            stmt = stmt.where(RagDocument.id.in_(document_ids))
        if current_only:
            stmt = stmt.where(
                RagDocument.status == DocumentStatus.INDEXED.value,
                or_(
                    RagDocument.current_revision_id == RagChunk.revision_id,
                    and_(RagDocument.current_revision_id.is_(None), RagChunk.revision_id.is_(None)),
                ),
            ).execution_options(populate_existing=True)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_current_pdf_source_key(
        self, *, document_id: str, revision_id: str, user_id: str
    ) -> str | None:
        """Return the original PDF object only when its bytes match the current revision."""
        checksum = sql_cast(RagDocument.metadata_json, JSON).op("->>")("checksum_sha256")
        stmt = (
            select(RagDocument.storage_path)
            .join(
                RagDocumentRevision,
                and_(
                    RagDocumentRevision.id == RagDocument.current_revision_id,
                    RagDocumentRevision.document_id == RagDocument.id,
                ),
            )
            .where(
                RagDocument.id == document_id,
                RagDocumentRevision.id == revision_id,
                *_owned_document_scope(user_id),
                RagDocument.deleted_at.is_(None),
                RagDocument.status == DocumentStatus.INDEXED.value,
                RagDocument.content_type == "application/pdf",
                RagDocumentRevision.source_content_hash == checksum,
            )
        )
        return await self.db.scalar(stmt)
