from typing import Any


def __getattr__(name: str) -> Any:
    if name == "celery_app":
        from backend.workers.celery_app import celery_app

        return celery_app
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["celery_app"]
