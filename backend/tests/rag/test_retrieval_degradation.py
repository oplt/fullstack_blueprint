"""Regression coverage for retrieval branch-degradation classification."""

from __future__ import annotations

import pytest

from backend.modules.rag.retrieval import _classify_branch_degradation


@pytest.mark.parametrize(
    ("dense_attempted", "lexical_attempted", "any_dense_ok", "any_lexical_ok", "expected"),
    [
        (False, False, False, False, (False, None)),
        (True, False, True, False, (False, None)),
        (True, False, False, False, (True, "dense_branch_failed")),
        (False, True, False, True, (False, None)),
        (False, True, False, False, (True, "lexical_branch_failed")),
        (True, True, True, True, (False, None)),
        (True, True, True, False, (True, "lexical_branch_failed")),
        (True, True, False, True, (True, "dense_branch_failed")),
        (True, True, False, False, (True, "both_branches_failed")),
    ],
)
def test_classify_branch_degradation(
    dense_attempted: bool,
    lexical_attempted: bool,
    any_dense_ok: bool,
    any_lexical_ok: bool,
    expected: tuple[bool, str | None],
) -> None:
    assert (
        _classify_branch_degradation(
            dense_attempted=dense_attempted,
            lexical_attempted=lexical_attempted,
            any_dense_ok=any_dense_ok,
            any_lexical_ok=any_lexical_ok,
        )
        == expected
    )
