from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from time import perf_counter
from typing import Any, Literal
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.pagination import MAX_PAGE_LIMIT
from backend.modules.memory import telemetry
from backend.modules.memory.cache import (
    get_cached_memory_search,
    invalidate_memory_search_cache,
    set_cached_memory_search,
)
from backend.modules.memory.config import MemoryConfig
from backend.modules.memory.processing import MemoryConsolidator
from backend.modules.memory.retrieval import MemoryContextBuilder
from backend.modules.memory.domain import (
    MemoryItem,
    MemoryMetadata,
    MemorySearchRequest,
    MemoryWriteResult,
)
from backend.modules.memory.domain import (
    AgentScope,
    MemoryLevel,
    MemoryOperation,
    MemoryPrivacy,
    MemorySource,
    MemoryType,
)
from backend.modules.memory.processing import MemoryExtractor
from backend.modules.memory.governance import (
    evaluate_memory_governance,
    provenance_payload,
)
from backend.modules.memory.models import MemoryRegistry
from backend.modules.memory.policies import MemoryPolicyService, session_expires_at
from backend.modules.memory.provider import Mem0Client
from backend.modules.memory.repository import (
    MemoryAuditRepository,
    MemoryRegistryRepository,
)
from backend.modules.memory.processing import MemoryRouter
from backend.modules.projects.permissions import ProjectAccessPort, SqlAlchemyProjectAccessPort

logger = logging.getLogger(__name__)


def _agent_scope_for_level(level: MemoryLevel) -> AgentScope | None:
    if level == MemoryLevel.AGENT:
        return AgentScope.USER_AGENT
    return None


def _untrusted_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    return {
        key: value
        for key, value in (metadata or {}).items()
        if key not in MemoryMetadata.__dataclass_fields__
    }


class MemoryService:
    def __init__(self, db: AsyncSession, config: MemoryConfig | None = None):
        self.db = db
        self.config = config or MemoryConfig.from_settings()
        self.mem0 = Mem0Client(self.config)
        self.audit_repo = MemoryAuditRepository(db)
        self.registry_repo = MemoryRegistryRepository(db)
        self.project_access: ProjectAccessPort = SqlAlchemyProjectAccessPort(db)
        self.policy = MemoryPolicyService(self.config.min_confidence)
        self.router = MemoryRouter()
        self.extractor = MemoryExtractor(self.router)
        self.consolidator = MemoryConsolidator()
        self.context_builder = MemoryContextBuilder(self, consolidator=self.consolidator)

    async def remember(
        self,
        *,
        user_id: str,
        agent_id: str,
        content: str,
        memory_level: str,
        run_id: str | None = None,
        project_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        memory_type: str | None = None,
        source: str = MemorySource.CHAT.value,
        source_ref: str | None = None,
        confidence: float = 0.8,
        privacy: str = MemoryPrivacy.NORMAL.value,
        consent_status: str = "implicit",
        retention_days: int | None = None,
        skip_policy: bool = False,
    ) -> MemoryWriteResult:
        level = MemoryLevel(memory_level)
        mtype = MemoryType(memory_type or MemoryType.FACT.value)
        rejection = self._write_rejection(level, mtype, consent_status)
        if rejection:
            return rejection

        privacy_level = MemoryPrivacy(privacy)

        await self._authorize_write(
            user_id=user_id,
            memory_level=level,
            project_id=project_id,
        )

        if not skip_policy:
            decision = self.policy.evaluate(
                content=content,
                memory_level=level,
                memory_type=mtype,
                confidence=confidence,
                privacy=privacy_level,
            )
            if not decision.allowed:
                telemetry.rejected_memory_count.labels(reason=decision.reason or "unknown").inc()
                return MemoryWriteResult(
                    memory_id="",
                    memory_level=level,
                    memory_type=mtype,
                    accepted=False,
                    rejection_reason=decision.reason,
                )
            confidence = decision.adjusted_confidence or confidence
            privacy_level = decision.privacy

        governance = evaluate_memory_governance(
            content=content,
            level=level,
            confidence=confidence,
            consent_status=consent_status,
            retention_days=retention_days
            if retention_days is not None
            else self.config.default_retention_days,
            sensitive_filter_enabled=self.config.sensitive_filter_enabled,
        )
        if not governance.allowed:
            return MemoryWriteResult(
                memory_id="",
                memory_level=level,
                memory_type=mtype,
                accepted=False,
                rejection_reason=governance.reason,
            )
        content = governance.content

        now = datetime.now(UTC)
        meta = MemoryMetadata(
            memory_level=level,
            memory_type=mtype,
            user_id=user_id,
            agent_id=agent_id,
            run_id=run_id,
            project_id=project_id,
            source=MemorySource(source),
            source_ref=source_ref,
            confidence=confidence,
            created_at=now,
            last_seen_at=now,
            privacy=privacy_level,
            scope=_agent_scope_for_level(level),
        )
        if level == MemoryLevel.SESSION:
            meta.expires_at = session_expires_at(self.config.session_ttl_days)
        else:
            meta.expires_at = governance.expires_at

        merged_meta = {
            **_untrusted_metadata(metadata),
            **meta.to_dict(),
            "content_hash": governance.content_hash,
            "consent_status": consent_status,
            "retention_policy": "custom" if retention_days is not None else "default",
            "provenance": provenance_payload(
                source=source,
                source_ref=source_ref,
                run_id=run_id,
                consent_status=consent_status,
            ),
        }
        external_id = ""
        try:
            result = await self.mem0.add(
                content=content,
                memory_level=level,
                user_id=user_id,
                agent_id=agent_id,
                run_id=run_id,
                project_id=project_id,
                metadata=merged_meta,
            )
            external_id = self._extract_memory_id(result)
            telemetry.memory_add_success.inc()
        except Exception:
            telemetry.memory_add_failure.inc()
            logger.exception("Mem0 add failed for user=%s level=%s", user_id, level.value)
            return MemoryWriteResult(
                memory_id="",
                memory_level=level,
                memory_type=mtype,
                accepted=False,
                rejection_reason="mem0_unavailable",
            )

        if external_id:
            await self.registry_repo.register(
                external_memory_id=external_id,
                user_id=user_id,
                agent_id=agent_id,
                run_id=run_id,
                project_id=project_id,
                memory_level=level.value,
                memory_type=mtype.value,
                scope=meta.scope.value if meta.scope else None,
                confidence=confidence,
                consent_status=consent_status,
                retention_policy=merged_meta["retention_policy"],
                expires_at=meta.expires_at,
                content_hash=governance.content_hash,
                provenance=merged_meta["provenance"],
            )
            await invalidate_memory_search_cache(user_id=user_id)

        if self.config.audit_enabled:
            await self.audit_repo.log_operation(
                user_id=user_id,
                agent_id=agent_id,
                run_id=run_id,
                project_id=project_id,
                operation=MemoryOperation.ADD,
                external_memory_id=external_id or None,
                memory_level=level.value,
                memory_type=mtype.value,
                metadata=merged_meta,
                source_ref=source_ref,
            )
            await self.db.commit()

        return MemoryWriteResult(
            memory_id=external_id or str(uuid4()),
            memory_level=level,
            memory_type=mtype,
            accepted=bool(external_id),
            rejection_reason=None if external_id else "mem0_empty_response",
        )

    def _write_rejection(
        self,
        level: MemoryLevel,
        memory_type: MemoryType,
        consent_status: str,
    ) -> MemoryWriteResult | None:
        reason = None
        if not self.config.enabled:
            reason = "memory_disabled"
        elif not self.config.write_enabled:
            reason = "memory_write_disabled"
        elif self.config.consent_required and consent_status != "explicit":
            reason = "consent_required"
        if reason is None:
            return None
        return MemoryWriteResult(
            memory_id="",
            memory_level=level,
            memory_type=memory_type,
            accepted=False,
            rejection_reason=reason,
        )

    async def recall(
        self,
        request: MemorySearchRequest,
    ) -> list[MemoryItem]:
        if not self.config.enabled:
            return []

        user_id = request.user_id
        agent_id = request.agent_id
        query = request.query
        run_id = request.run_id
        project_id = request.project_id
        limit = request.limit
        memory_levels = request.memory_levels
        resolved_limit = limit or self.config.default_limit
        levels = [MemoryLevel(level) for level in memory_levels] if memory_levels else None
        if project_id:
            await self._ensure_project_access(user_id, project_id)

        level_values = (
            [level.value for level in levels] if levels else [level.value for level in MemoryLevel]
        )
        cached = await get_cached_memory_search(
            user_id=user_id,
            agent_id=agent_id,
            query=query,
            run_id=run_id,
            project_id=project_id,
            memory_levels=level_values,
            limit=resolved_limit,
        )
        if cached is not None:
            return await self._filter_authorized_read_items(user_id, cached)

        collected: list[MemoryItem] = []
        search_levels = levels or list(MemoryLevel)
        started = perf_counter()

        async def _search_level(level: MemoryLevel) -> list[MemoryItem]:
            if level == MemoryLevel.PROJECT and not project_id:
                return []
            if level == MemoryLevel.SESSION and not run_id:
                return []
            return await self.mem0.search(
                query=query,
                memory_level=level,
                user_id=user_id,
                agent_id=agent_id,
                run_id=run_id,
                project_id=project_id,
                top_k=resolved_limit,
            )

        try:
            level_results = await asyncio.gather(*[_search_level(level) for level in search_levels])
            for level_items in level_results:
                collected.extend(level_items)
            collected = await self._filter_authorized_read_items(user_id, collected)
            telemetry.memory_search_success.inc()
        except Exception:
            telemetry.memory_search_failure.inc()
            logger.exception("Mem0 search failed for user=%s", user_id)
            return []
        finally:
            elapsed_ms = (perf_counter() - started) * 1000
            telemetry.memory_search_latency_ms.observe(elapsed_ms)

        logger.debug(
            "Memory search completed user=%s results=%s duration_ms=%.2f",
            user_id,
            len(collected),
            elapsed_ms,
        )

        if self.config.audit_enabled:
            await self.audit_repo.log_operation(
                user_id=user_id,
                agent_id=agent_id,
                run_id=run_id,
                project_id=project_id,
                operation=MemoryOperation.SEARCH,
                external_memory_id=None,
                memory_level=search_levels[0].value if len(search_levels) == 1 else None,
                memory_type=None,
                metadata={"levels": level_values, "result_count": len(collected)},
                source_ref=None,
            )
            await self.db.commit()

        consolidated = self.consolidator.consolidate(collected)
        result = consolidated[:resolved_limit]
        await set_cached_memory_search(
            user_id=user_id,
            agent_id=agent_id,
            query=query,
            run_id=run_id,
            project_id=project_id,
            memory_levels=level_values,
            limit=resolved_limit,
            items=result,
        )
        return result

    async def forget(
        self,
        *,
        user_id: str,
        memory_id: str,
        reason: str,
        is_admin: bool = False,
    ) -> None:
        registry = await self._get_mutable_registry(
            user_id=user_id,
            memory_id=memory_id,
            is_admin=is_admin,
            operation="forget",
        )

        try:
            await self.mem0.delete(memory_id)
        except Exception as exc:
            logger.exception("Mem0 delete failed for memory_id=%s", memory_id)
            raise HTTPException(status_code=503, detail="Memory service unavailable") from exc

        await self.registry_repo.mark_deleted(memory_id)
        if self.config.audit_enabled:
            await self.audit_repo.log_operation(
                user_id=user_id,
                agent_id=registry.agent_id,
                run_id=registry.run_id,
                project_id=registry.project_id,
                operation=MemoryOperation.FORGET,
                external_memory_id=memory_id,
                memory_level=registry.memory_level,
                memory_type=registry.memory_type,
                metadata={"reason": reason},
                source_ref=None,
            )
            await self.db.commit()
        cache_user_id = registry.user_id or user_id
        await invalidate_memory_search_cache(user_id=cache_user_id)

    async def correct(
        self,
        *,
        user_id: str,
        memory_id: str,
        content: str,
        reason: str,
        is_admin: bool = False,
    ) -> MemoryWriteResult:
        registry = await self._get_mutable_registry(
            user_id=user_id,
            memory_id=memory_id,
            is_admin=is_admin,
            operation="correct",
        )

        result = await self.remember(
            user_id=user_id,
            agent_id=registry.agent_id or "default",
            content=content,
            memory_level=registry.memory_level,
            memory_type=registry.memory_type,
            run_id=registry.run_id,
            project_id=registry.project_id,
            source=MemorySource.MANUAL.value,
            source_ref=memory_id,
            confidence=registry.confidence,
            consent_status=registry.consent_status,
            metadata={"corrects_memory_id": memory_id, "correction_reason": reason},
        )
        if not result.accepted:
            return result
        await self.mem0.delete(memory_id)
        await self.registry_repo.mark_corrected(memory_id, result.memory_id)
        if self.config.audit_enabled:
            await self.audit_repo.log_operation(
                user_id=user_id,
                agent_id=registry.agent_id,
                run_id=registry.run_id,
                project_id=registry.project_id,
                operation=MemoryOperation.UPDATE,
                external_memory_id=memory_id,
                memory_level=registry.memory_level,
                memory_type=registry.memory_type,
                metadata={"reason": reason, "replacement_id": result.memory_id},
                source_ref=memory_id,
            )
            await self.db.commit()
        await invalidate_memory_search_cache(user_id=user_id)
        return result

    async def export_user_memories(
        self, *, user_id: str, agent_id: str = "default"
    ) -> list[MemoryItem]:
        if not self.config.enabled:
            return []
        collected: list[MemoryItem] = []
        for level in MemoryLevel:
            collected.extend(
                await self.mem0.get_all(
                    memory_level=level,
                    user_id=user_id,
                    agent_id=agent_id,
                    run_id=None,
                    project_id=None,
                    top_k=MAX_PAGE_LIMIT,
                )
            )
        return self.consolidator.consolidate(
            await self._filter_authorized_read_items(user_id, collected)
        )

    async def list_user_memories(
        self,
        *,
        user_id: str,
        memory_level: str | None = None,
        project_id: str | None = None,
        agent_id: str = "default",
        limit: int | None = None,
        offset: int = 0,
    ) -> tuple[list[MemoryItem], int]:
        if not self.config.enabled:
            return [], 0

        if project_id:
            await self._ensure_project_access(user_id, project_id)

        resolved_limit = limit or self.config.default_limit
        fetch_cap = min(offset + resolved_limit, MAX_PAGE_LIMIT)
        levels = [MemoryLevel(memory_level)] if memory_level else [MemoryLevel.USER]

        async def _fetch_level(level: MemoryLevel) -> list[MemoryItem]:
            rows = await self.mem0.get_all(
                memory_level=level,
                user_id=user_id,
                agent_id=agent_id,
                run_id=None,
                project_id=project_id,
                top_k=fetch_cap,
            )
            return await self._filter_authorized_read_items(user_id, rows)

        level_results = await asyncio.gather(*[_fetch_level(level) for level in levels])
        items: list[MemoryItem] = []
        for rows in level_results:
            items.extend(rows)
        consolidated = self.consolidator.consolidate(items)
        total = len(consolidated)
        page = consolidated[offset : offset + resolved_limit]
        return page, total

    async def get_memory(self, *, user_id: str, memory_id: str) -> MemoryItem:
        registry = await self.registry_repo.get_by_external_id(memory_id)
        if not registry or registry.status != "active" or registry.user_id != user_id:
            raise HTTPException(status_code=404, detail="Memory not found")
        if registry.project_id:
            await self._ensure_project_access(user_id, registry.project_id)

        item = await self.mem0.get(memory_id)
        if not item:
            raise HTTPException(status_code=404, detail="Memory not found")
        authorized = await self._filter_authorized_read_items(user_id, [item])
        if not authorized:
            raise HTTPException(status_code=404, detail="Memory not found")
        return authorized[0]

    async def build_prompt_context(self, request: MemorySearchRequest) -> str:
        context, _degraded = await self.build_prompt_context_with_status(request)
        return context

    async def build_prompt_context_with_status(
        self, request: MemorySearchRequest
    ) -> tuple[str, bool]:
        context, _items, degraded = await self.recall_for_prompt(request)
        return context, degraded

    async def recall_for_prompt(
        self, request: MemorySearchRequest
    ) -> tuple[str, list[MemoryItem], bool]:
        if not self.config.enabled:
            return "", [], False
        try:
            items = await self.context_builder.recall_ranked(request)
            return self.context_builder.format_context_block(items), items, False
        except Exception:
            logger.exception("Memory recall failed for user=%s", request.user_id)
            return "", [], True

    async def process_turn_memories(
        self,
        *,
        user_id: str,
        agent_id: str,
        run_id: str | None,
        project_id: str | None,
        user_message: str,
        assistant_message: str,
        source_message_id: str | None = None,
    ) -> list[MemoryWriteResult]:
        if not self.config.enabled or not self.config.write_enabled:
            return []

        candidates = self.extractor.extract_from_turn(
            user_message=user_message,
            assistant_message=assistant_message,
            source_message_id=source_message_id,
        )
        if not candidates:
            return []

        async def _remember_candidate(candidate) -> MemoryWriteResult:
            return await self.remember(
                user_id=user_id,
                agent_id=agent_id,
                content=candidate.content,
                memory_level=candidate.routed.memory_level.value,
                memory_type=candidate.routed.memory_type.value,
                run_id=run_id if candidate.routed.memory_level == MemoryLevel.SESSION else None,
                project_id=project_id
                if candidate.routed.memory_level == MemoryLevel.PROJECT
                else None,
                confidence=candidate.routed.confidence,
                source=candidate.routed.source.value,
                source_ref=source_message_id,
            )

        return [await _remember_candidate(candidate) for candidate in candidates]

    async def _authorize_write(
        self,
        *,
        user_id: str,
        memory_level: MemoryLevel,
        project_id: str | None,
    ) -> None:
        if memory_level == MemoryLevel.PROJECT:
            if not project_id:
                raise HTTPException(
                    status_code=422,
                    detail="project_id is required for project memory",
                )
            await self._ensure_project_access(user_id, project_id)

    async def _get_mutable_registry(
        self,
        *,
        user_id: str,
        memory_id: str,
        is_admin: bool,
        operation: Literal["forget", "correct"],
    ) -> MemoryRegistry:
        registry = await self.registry_repo.get_by_external_id(memory_id)
        if registry is None or registry.status != "active":
            raise HTTPException(status_code=404, detail="Memory not found")
        if registry.user_id is None and not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can modify global memory")
        if registry.user_id != user_id and not is_admin:
            raise HTTPException(
                status_code=403,
                detail=f"You cannot {operation} another user's memory",
            )
        if registry.project_id:
            await self._ensure_project_access(user_id, registry.project_id)
        return registry

    async def _filter_authorized_read_items(
        self,
        user_id: str,
        items: list[MemoryItem],
    ) -> list[MemoryItem]:
        if not items:
            return []

        registry_rows = await self.registry_repo.get_active_by_external_ids(
            [item.id for item in items]
        )
        registry_by_id = {row.external_memory_id: row for row in registry_rows}
        project_ids = {
            row.project_id for row in registry_rows if row.user_id == user_id and row.project_id
        }
        accessible_project_ids = await self.project_access.filter_accessible_project_ids(
            user_id,
            project_ids,
        )
        now = datetime.now(UTC)
        authorized: list[MemoryItem] = []
        for item in items:
            registry = registry_by_id.get(item.id)
            if not registry or registry.user_id != user_id:
                continue
            if registry.expires_at and registry.expires_at <= now:
                continue
            if registry.project_id and registry.project_id not in accessible_project_ids:
                continue
            try:
                item.metadata.memory_level = MemoryLevel(registry.memory_level)
            except ValueError:
                continue
            item.metadata.user_id = user_id
            item.metadata.agent_id = registry.agent_id or ""
            item.metadata.run_id = registry.run_id
            item.metadata.project_id = registry.project_id
            try:
                item.metadata.scope = AgentScope(registry.scope) if registry.scope else None
            except ValueError:
                item.metadata.scope = None
            authorized.append(item)
        return authorized

    async def _ensure_project_access(self, user_id: str, project_id: str) -> None:
        project = await self.project_access.get_project_for_user(project_id, user_id)
        if not project:
            raise HTTPException(status_code=403, detail="Project access denied")

    @staticmethod
    def _extract_memory_id(result: dict[str, Any]) -> str:
        if not result:
            return ""
        if result.get("id"):
            return str(result["id"])
        results = result.get("results")
        if isinstance(results, list) and results:
            first = results[0]
            if isinstance(first, dict) and first.get("id"):
                return str(first["id"])
            if isinstance(first, dict) and first.get("memory_id"):
                return str(first["memory_id"])
        return str(result.get("memory_id", ""))
