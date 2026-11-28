from celery import Celery

from backend.core.config import settings
from backend.core.observability.logging import setup_logging

setup_logging()

celery_app = Celery(
    "fullstack_blueprint",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["backend.workers.tasks"],
)

celery_app.conf.update(
    task_default_queue=settings.CELERY_TASK_DEFAULT_QUEUE,
    task_routes={
        "backend.workers.tasks.send_email_task": {"queue": settings.CELERY_EMAIL_QUEUE},
        "backend.workers.tasks.index_rag_document_task": {
            "queue": settings.CELERY_TASK_DEFAULT_QUEUE
        },
        "backend.workers.tasks.run_ai_evaluation_task": {
            "queue": settings.CELERY_TASK_DEFAULT_QUEUE
        },
    },
    beat_schedule={
        "publish-outbox-events": {
            "task": "backend.workers.tasks.publish_outbox_events_task",
            "schedule": settings.CELERY_OUTBOX_PUBLISH_INTERVAL_SECONDS,
            "kwargs": {"limit": 100},
        },
    },
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    result_expires=settings.CELERY_RESULT_EXPIRES_SECONDS,
    broker_connection_retry_on_startup=True,
    task_track_started=True,
    task_ignore_result=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT_SECONDS,
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT_SECONDS,
    broker_transport_options={
        "visibility_timeout": settings.CELERY_BROKER_VISIBILITY_TIMEOUT_SECONDS,
    },
    timezone="UTC",
    enable_utc=True,
)

import backend.workers.logging_hooks  # noqa: F401,E402 — register Celery signal handlers
