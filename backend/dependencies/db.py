from collections.abc import AsyncGenerator
from time import monotonic

from fastapi import Request

from backend.db.pool_observability import observe_database_request
from backend.db.session import SessionLocal, observe_session_duration


async def get_db(request: Request) -> AsyncGenerator:
    started_at = monotonic()
    route = request.scope.get("route")
    route_path = getattr(route, "path", None)
    route_label = route_path if isinstance(route_path, str) and route_path else "unmatched"
    with observe_database_request(role="api", route=route_label):
        try:
            async with SessionLocal() as session:
                yield session
        finally:
            observe_session_duration(role="api", started_at=started_at)
