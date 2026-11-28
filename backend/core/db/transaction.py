"""Explicit transaction ownership for application commands.

Repositories flush changes but do not commit. Application services or a
``TransactionOwner`` own the commit/rollback boundary. The helper is also
usable by tests with a session double.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession


class TransactionSession(Protocol):
    async def commit(self) -> None: ...

    async def rollback(self) -> None: ...


class TransactionOwner:
    """Small explicit transaction owner injected into an application service."""

    def __init__(self, session: TransactionSession):
        self.session = session

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()


@asynccontextmanager
async def transaction(session: AsyncSession) -> AsyncIterator[AsyncSession]:
    """Commit once on success and rollback once on failure.

    The session remains request-scoped. This context is intended for command
    composition where an application service and its audit/outbox writes must
    share one transaction.
    """

    try:
        yield session
    except BaseException:
        await session.rollback()
        raise
    else:
        await session.commit()
