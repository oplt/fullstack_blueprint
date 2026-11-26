"""Validated idempotency-key boundary for state-changing commands."""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import Header, HTTPException

_IDEMPOTENCY_KEY = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")


def idempotency_key(
    value: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> str:
    """Require a bounded key for commands that opt into replay semantics."""

    if value is None or not _IDEMPOTENCY_KEY.fullmatch(value):
        raise HTTPException(
            status_code=400,
            detail="Idempotency-Key is required and must be 1-128 safe characters",
        )
    return value
