"""Safe settings for tests that only exercise in-process code."""

import os

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://blueprint@127.0.0.1:1/unused")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:1/0")
os.environ.setdefault("JWT_SECRET", "test-only-blueprint-signing-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_DAYS", "7")
os.environ.setdefault("LOG_TO_FILE", "false")
