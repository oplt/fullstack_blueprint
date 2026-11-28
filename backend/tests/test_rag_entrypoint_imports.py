import importlib

import pytest


@pytest.mark.parametrize(
    "module_name",
    (
        "backend.tests.rag.chunking_experiments",
        "backend.tests.rag.end_to_end_eval",
        "backend.tests.rag.live_benchmark",
        "backend.tests.rag.pgvector_benchmark",
        "backend.tests.rag.run_end_to_end",
        "backend.tests.rag.run_pgvector_load",
    ),
)
def test_rag_cli_and_benchmark_modules_import_from_canonical_paths(module_name: str) -> None:
    importlib.import_module(module_name)
