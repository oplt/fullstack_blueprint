from backend.core.config import settings
from backend.workers.celery_app import celery_app


def main() -> None:
    queues = f"{settings.CELERY_TASK_DEFAULT_QUEUE},{settings.CELERY_EMAIL_QUEUE}"
    celery_app.worker_main(
        [
            "worker",
            "--loglevel=INFO",
            "--queues",
            queues,
            "--concurrency",
            str(settings.CELERY_CONCURRENCY),
        ]
    )


if __name__ == "__main__":
    main()
