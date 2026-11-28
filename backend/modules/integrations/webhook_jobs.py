"""Signed, idempotent webhook delivery state machine."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import random
from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.admin.platform.models import WebhookDelivery

logger = logging.getLogger(__name__)


class StaleWebhookAttemptError(RuntimeError):
    """Delivery attempt no longer owns its lease and cannot update the row."""


def sign_webhook_payload(
    secret: str, payload: dict | bytes, *, timestamp: int | None = None, version: str = "v1"
) -> str:
    sent_at = timestamp if timestamp is not None else int(datetime.now(UTC).timestamp())
    body = (
        payload
        if isinstance(payload, bytes)
        else json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    digest = hmac.new(
        secret.encode(), str(sent_at).encode() + b"." + body, hashlib.sha256
    ).hexdigest()
    return f"{version}={digest}"


def verify_webhook_signature(
    secret: str,
    body: str | bytes,
    signature: str,
    timestamp: int,
    *,
    max_age_seconds: int = 300,
    now: int | None = None,
) -> bool:
    current = now if now is not None else int(datetime.now(UTC).timestamp())
    if abs(current - timestamp) > max_age_seconds or "=" not in signature:
        return False
    version, provided = signature.split("=", 1)
    if version != "v1":
        return False
    body_bytes = body.encode("utf-8") if isinstance(body, str) else body
    expected = hmac.new(
        secret.encode(), str(timestamp).encode() + b"." + body_bytes, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(provided, expected)


def _retry_jitter_factor() -> float:
    return random.SystemRandom().uniform(0.8, 1.2)


class WebhookDeliveryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def enqueue(
        self,
        *,
        webhook_id: str,
        event_id: str,
        payload: dict,
        event_version: str = "v1",
    ) -> WebhookDelivery:
        statement = (
            insert(WebhookDelivery)
            .values(
                webhook_id=webhook_id,
                event_id=event_id,
                event_version=event_version,
                payload_json=payload,
            )
            .on_conflict_do_nothing(constraint="uq_webhook_delivery_event")
            .returning(WebhookDelivery)
        )
        inserted = (await self.db.execute(statement)).scalar_one_or_none()
        if inserted is not None:
            return inserted
        delivery = await self.db.scalar(
            select(WebhookDelivery).where(
                WebhookDelivery.webhook_id == webhook_id,
                WebhookDelivery.event_id == event_id,
            )
        )
        if delivery is None:
            raise RuntimeError("Conflicting webhook delivery could not be loaded")
        return delivery

    async def claim_batch(
        self,
        *,
        limit: int = 100,
        lease_seconds: int = 300,
        max_attempts: int = 8,
    ) -> list[WebhookDelivery]:
        """Claim due deliveries; caller must commit before making network requests."""
        if limit < 1 or lease_seconds < 1 or max_attempts < 1:
            raise ValueError("claim limits must be positive")
        now = datetime.now(UTC)
        due = or_(WebhookDelivery.next_attempt_at.is_(None), WebhookDelivery.next_attempt_at <= now)
        claimable = or_(
            and_(WebhookDelivery.status.in_(("pending", "retrying")), due),
            and_(WebhookDelivery.status == "processing", due),
        )
        await self.db.execute(
            update(WebhookDelivery)
            .where(claimable, WebhookDelivery.attempt_count >= max_attempts)
            .values(status="dead_letter", next_attempt_at=None)
        )
        statement = (
            select(WebhookDelivery)
            .where(claimable, WebhookDelivery.attempt_count < max_attempts)
            .order_by(
                func.coalesce(WebhookDelivery.next_attempt_at, WebhookDelivery.created_at),
                WebhookDelivery.created_at,
                WebhookDelivery.id,
            )
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        deliveries = list((await self.db.execute(statement)).scalars().all())
        lease_until = now + timedelta(seconds=lease_seconds)
        for delivery in deliveries:
            delivery.status = "processing"
            delivery.attempt_count += 1
            delivery.next_attempt_at = lease_until
        await self.db.flush()
        return deliveries

    async def mark_attempt(
        self,
        delivery: WebhookDelivery,
        *,
        response_status: int | None = None,
        error: str | None = None,
        retryable: bool = True,
        max_attempts: int = 8,
    ) -> WebhookDelivery:
        now = datetime.now(UTC)
        values: dict = {
            "response_status": response_status,
            "last_error": error[:1000] if error else None,
        }
        if (
            response_status is not None
            and HTTPStatus.OK <= response_status < HTTPStatus.MULTIPLE_CHOICES
        ):
            values.update(status="delivered", delivered_at=now, next_attempt_at=None)
        elif retryable and delivery.attempt_count < max_attempts:
            exponential_delay = 2 ** min(delivery.attempt_count, 10)
            delay = min(3600, exponential_delay * _retry_jitter_factor())
            values.update(status="retrying", next_attempt_at=now + timedelta(seconds=delay))
        else:
            try:
                from backend.core.observability import prometheus_metrics  # noqa: PLC0415 - optional metrics

                prometheus_metrics.webhook_delivery_failures_total.inc()
            except (ImportError, AttributeError, ValueError) as exc:
                logger.debug(
                    "Webhook failure metrics unavailable error_type=%s", type(exc).__name__
                )
            values.update(status="dead_letter", next_attempt_at=None)
        statement = (
            update(WebhookDelivery)
            .where(
                WebhookDelivery.id == delivery.id,
                WebhookDelivery.status == "processing",
                WebhookDelivery.attempt_count == delivery.attempt_count,
            )
            .values(**values)
            .returning(WebhookDelivery)
            .execution_options(populate_existing=True)
        )
        updated = (await self.db.execute(statement)).scalar_one_or_none()
        if updated is None:
            raise StaleWebhookAttemptError("Webhook delivery lease was lost")
        return updated
