import json
import logging
import secrets
from datetime import UTC, datetime
from http import HTTPStatus

import httpx
from fastapi import HTTPException

from backend.core.config import settings
from backend.core.pagination import DEFAULT_PAGE_LIMIT
from backend.core.safe_http import (
    OutboundResolutionError,
    UnsafeTargetError,
    safe_post,
    validate_target,
)
from backend.modules.admin.platform.models import WebhookEndpoint
from backend.modules.admin.platform_configuration import PlatformConfigService
from backend.modules.identity.models import User
from backend.modules.integrations.webhook_jobs import sign_webhook_payload

logger = logging.getLogger(__name__)


class WebhookService(PlatformConfigService):
    async def list_webhooks_for_user(
        self,
        user: User,
        *,
        limit: int = DEFAULT_PAGE_LIMIT,
        offset: int = 0,
    ) -> tuple[list[WebhookEndpoint], int]:
        await self.ensure_module_enabled("webhooks")
        return await self.repo.list_webhooks_for_user(user.id, limit=limit, offset=offset)

    async def create_webhook_for_user(
        self,
        user: User,
        *,
        target_url: str,
        description: str | None,
        events: list[str],
    ) -> WebhookEndpoint:
        await self.ensure_module_enabled("webhooks")
        await self._validate_webhook_target(target_url)
        webhook = await self.repo.create_webhook(
            user_id=user.id,
            target_url=target_url,
            description=description,
            secret=secrets.token_urlsafe(24),
            is_active=True,
            events_json=events,
        )
        await self.db.commit()
        await self.db.refresh(webhook)
        logger.info("Webhook created user=%s webhook=%s", user.id, webhook.id)
        return webhook

    async def update_webhook_for_user(
        self, user: User, webhook_id: str, payload: dict
    ) -> WebhookEndpoint:
        await self.ensure_module_enabled("webhooks")
        webhook = await self.repo.get_webhook_for_user(user.id, webhook_id)
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook endpoint not found")

        for field, value in payload.items():
            if field == "events":
                webhook.events_json = value
            elif field == "target_url" and value is not None:
                await self._validate_webhook_target(str(value))
                webhook.target_url = str(value)
            elif value is not None:
                setattr(webhook, field, value)

        await self.db.commit()
        await self.db.refresh(webhook)
        logger.info(
            "Webhook updated user=%s webhook=%s fields=%s", user.id, webhook.id, sorted(payload)
        )
        return webhook

    async def delete_webhook_for_user(self, user: User, webhook_id: str) -> None:
        await self.ensure_module_enabled("webhooks")
        webhook = await self.repo.get_webhook_for_user(user.id, webhook_id)
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook endpoint not found")
        await self.repo.delete_webhook(webhook)
        await self.db.commit()
        logger.info("Webhook deleted user=%s webhook=%s", user.id, webhook_id)

    async def test_webhook_for_user(self, user: User, webhook_id: str) -> dict:
        await self.ensure_module_enabled("webhooks")
        webhook = await self.repo.get_webhook_for_user(user.id, webhook_id)
        if not webhook:
            raise HTTPException(status_code=404, detail="Webhook endpoint not found")

        metadata = await self.get_platform_metadata()
        payload = {
            "event": "platform.test",
            "sent_at": datetime.now(UTC).isoformat(),
            "app_name": metadata.app_name,
            "core_domain_plural": metadata.core_domain_plural,
            "target_user_id": user.id,
        }
        raw_body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        signature_timestamp = int(datetime.now(UTC).timestamp())
        signature = sign_webhook_payload(
            webhook.secret,
            raw_body,
            timestamp=signature_timestamp,
        )
        status_code: int | None = None
        error: str | None = None
        try:
            status_code = await safe_post(
                webhook.target_url,
                content=raw_body,
                headers={
                    "Content-Type": "application/json",
                    "X-Generic-App-Event": payload["event"],
                    "X-Generic-App-Signature": signature,
                    "X-Generic-App-Signature-Timestamp": str(signature_timestamp),
                },
                allowed_hosts=set(settings.WEBHOOK_ALLOWED_HOSTS.split(",")),
                require_allowlist=settings.is_production,
            )
        except UnsafeTargetError as exc:
            error = "Webhook destination rejected"
            logger.warning(
                "Webhook target rejected user=%s webhook=%s error_type=%s",
                user.id,
                webhook.id,
                type(exc).__name__,
            )
        except (OutboundResolutionError, httpx.HTTPError, TimeoutError) as exc:
            error = "Webhook delivery failed"
            logger.warning(
                "Webhook request failed user=%s webhook=%s error_type=%s",
                user.id,
                webhook.id,
                type(exc).__name__,
            )

        delivered = (
            status_code is not None and HTTPStatus.OK <= status_code < HTTPStatus.MULTIPLE_CHOICES
        )
        if status_code is not None and not delivered:
            logger.warning(
                "Webhook test delivery failed user=%s webhook=%s status=%s",
                user.id,
                webhook.id,
                status_code,
            )

        webhook.last_tested_at = datetime.now(UTC)
        webhook.last_response_status = status_code
        await self.db.commit()
        await self.db.refresh(webhook)

        return {
            "delivered": delivered,
            "status_code": status_code,
            "response_preview": None,
            "error": error,
        }

    @staticmethod
    async def _validate_webhook_target(target_url: str) -> None:
        try:
            await validate_target(
                target_url,
                allowed_hosts=set(settings.WEBHOOK_ALLOWED_HOSTS.split(",")),
                require_allowlist=settings.is_production,
            )
        except UnsafeTargetError as exc:
            raise HTTPException(
                status_code=422,
                detail="Invalid or prohibited webhook destination",
            ) from exc
        except (OutboundResolutionError, TimeoutError) as exc:
            raise HTTPException(
                status_code=422,
                detail="Webhook target could not be resolved",
            ) from exc
