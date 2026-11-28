"""Resolve local token counters for embedding inputs."""

from __future__ import annotations

import hashlib
import os
import tempfile
from collections.abc import Callable
from functools import lru_cache
from pathlib import Path

from backend.core.vectors import estimate_tokens

_OPENAI_MODELS = {"text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"}
OPENAI_INPUT_LIMIT = 8192
_ENCODING_SHA256 = {
    "cl100k_base": "223921b76ee99bde995b7ff738513eef100fb51d18c93597a113bcffe865b2a7",
    "o200k_base": "446a9538cb6c348e3516120d7c08b09f57c36495e2acfffe59a5bf8b0cfb1a2d",
}


@lru_cache(maxsize=4)
def _cached_openai_count(cache_dir: str, encoding_name: str) -> Callable[[str], int] | None:
    # tiktoken fetches missing assets on demand. Only call it with a verified local cache.
    asset = f"https://openaipublic.blob.core.windows.net/encodings/{encoding_name}.tiktoken"
    key = hashlib.sha1(asset.encode(), usedforsecurity=False).hexdigest()
    try:
        with (Path(cache_dir) / key).open("rb") as asset:
            if hashlib.file_digest(asset, "sha256").hexdigest() != _ENCODING_SHA256[encoding_name]:
                return None
        import tiktoken

        encoding = tiktoken.get_encoding(encoding_name)
    except (ImportError, OSError, ValueError):
        return None
    return lambda text: len(encoding.encode_ordinary(text))


def resolve_token_counter(
    provider: str, model: str
) -> tuple[str, Callable[[str], int], int | None]:
    if provider != "openai" or model not in _OPENAI_MODELS:
        return "character-estimate", estimate_tokens, None
    name, counter = resolve_generation_token_counter(provider, model)
    return name, counter, OPENAI_INPUT_LIMIT


def resolve_generation_token_counter(provider: str, model: str) -> tuple[str, Callable[[str], int]]:
    if provider == "openai":
        try:
            import tiktoken

            encoding = tiktoken.encoding_name_for_model(model)
        except (ImportError, KeyError):
            encoding = None
        if encoding in _ENCODING_SHA256 and (counter := _local_count(encoding)):
            return encoding, counter
    return "utf8-byte-upper-bound", lambda text: len(text.encode())


def _local_count(encoding: str) -> Callable[[str], int] | None:
    cache = os.getenv("TIKTOKEN_CACHE_DIR", os.getenv("DATA_GYM_CACHE_DIR", ""))
    if "TIKTOKEN_CACHE_DIR" not in os.environ and "DATA_GYM_CACHE_DIR" not in os.environ:
        cache = str(Path(tempfile.gettempdir()) / "data-gym-cache")
    return _cached_openai_count(cache, encoding) if cache else None
