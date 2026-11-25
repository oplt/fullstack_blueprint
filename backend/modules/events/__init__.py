"""Cross-module domain events and the transactional outbox."""

from backend.modules.events.domain import DomainEvent
from backend.modules.events.service import OutboxService

__all__ = ["DomainEvent", "OutboxService"]
