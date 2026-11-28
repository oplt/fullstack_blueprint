from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from backend.workers.celery_app import celery_app as celery_app


def __getattr__(name: str) -> Any:
    if name == "celery_app":
        from backend.workers.celery_app import celery_app  # noqa: PLC0415 - lazy worker app import

        return celery_app

    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["celery_app"]
