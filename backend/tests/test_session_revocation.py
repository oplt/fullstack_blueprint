import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.modules.identity.repository import IdentityRepository


@pytest.mark.asyncio
async def test_refresh_session_lookup_keeps_row_lock():
    db = MagicMock()
    db.execute = AsyncMock(return_value=SimpleNamespace(scalar_one_or_none=lambda: None))

    await IdentityRepository(db).get_refresh_session_by_hash("token-hash")

    unittest.TestCase().assertIn("FOR UPDATE", str(db.execute.await_args.args[0]))


@pytest.mark.asyncio
async def test_bulk_revocation_is_one_update_for_active_unexpired_sessions():
    db = MagicMock()
    db.execute = AsyncMock()

    await IdentityRepository(db).revoke_all_refresh_sessions_for_user("user-1")

    statement = str(db.execute.await_args.args[0])
    testcase = unittest.TestCase()
    testcase.assertIn("UPDATE refresh_sessions", statement)
    testcase.assertIn("refresh_sessions.user_id =", statement)
    testcase.assertIn("refresh_sessions.is_revoked IS false", statement)
    testcase.assertIn("refresh_sessions.expires_at >", statement)
    testcase.assertEqual(db.execute.await_count, 1)
