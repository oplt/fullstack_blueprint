"""Composition-root event handler registry.

Handlers are intentionally empty until a capability opts into a durable event
contract. Unknown event types stay in the outbox and eventually move to the
dead-letter state rather than being silently discarded.
"""

from collections.abc import Awaitable, Callable

from backend.modules.events.domain import DomainEvent

EventHandler = Callable[[DomainEvent], Awaitable[None]]


async def noop_event_handler(_: DomainEvent) -> None:
    """Useful for integration tests and explicitly registered no-op events."""


def build_event_handlers() -> dict[str, EventHandler]:
    return {
        "platform.noop.v1": noop_event_handler,
        # Registered as a contract-safe sink until a notification/webhook
        # subscriber is selected by deployment configuration.
        "admin.user_status_changed.v1": noop_event_handler,
    }
