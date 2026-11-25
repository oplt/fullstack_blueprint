"""Signed, idempotent webhook delivery state machine."""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.platform.models import WebhookDelivery


def sign_webhook_payload(
    secret: str, payload: dict, *, timestamp: int | None = None, version: str = "v1"
) -> str:
    sent_at = timestamp or int(datetime.now(UTC).timestamp())
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    digest = hmac.new(secret.encode(), f"{sent_at}.{body}".encode(), hashlib.sha256).hexdigest()
    return f"{version}={digest}"


def verify_webhook_signature(
    secret: str,
    body: str,
    signature: str,
    timestamp: int,
    *,
    max_age_seconds: int = 300,
    now: int | None = None,
) -> bool:
    current = now or int(datetime.now(UTC).timestamp())
    if abs(current - timestamp) > max_age_seconds or "=" not in signature:
        return False
    version, provided = signature.split("=", 1)
    if version != "v1":
        return False
    expected = hmac.new(secret.encode(), f"{timestamp}.{body}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(provided, expected)


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
        existing = await self.db.scalar(
            select(WebhookDelivery).where(
                WebhookDelivery.webhook_id == webhook_id,
                WebhookDelivery.event_id == event_id,
            )
        )
        if existing:
            return existing
        delivery = WebhookDelivery(
            webhook_id=webhook_id,
            event_id=event_id,
            event_version=event_version,
            payload_json=payload,
        )
        self.db.add(delivery)
        await self.db.flush()
        return delivery

    async def mark_attempt(
        self,
        delivery: WebhookDelivery,
        *,
        response_status: int | None = None,
        error: str | None = None,
        retryable: bool = True,
        max_attempts: int = 8,
    ) -> WebhookDelivery:
        delivery.attempt_count += 1
        delivery.response_status = response_status
        delivery.last_error = error[:1000] if error else None
        if response_status is not None and 200 <= response_status < 300:
            delivery.status = "delivered"
            delivery.delivered_at = datetime.now(UTC)
            delivery.next_attempt_at = None
        elif retryable and delivery.attempt_count < max_attempts:
            delivery.status = "retrying"
            delivery.next_attempt_at = datetime.now(UTC) + timedelta(
                seconds=min(3600, 2 ** min(delivery.attempt_count, 10))
            )
        else:
            try:
                from backend.observability import prometheus_metrics

                prometheus_metrics.webhook_delivery_failures_total.inc()
            except Exception:
                pass
            delivery.status = "dead_letter"
            delivery.next_attempt_at = None
        await self.db.flush()
        return delivery
