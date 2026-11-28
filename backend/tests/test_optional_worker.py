import subprocess
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from backend.workers.async_dispatch import (
    dispatch_background_sync_job,
    resolve_celery_task,
)


class OptionalWorkerTests(TestCase):
    def test_async_dispatch_import_does_not_load_celery_app(self) -> None:
        subprocess.run(
            [
                sys.executable,
                "-c",
                "import sys; import backend.workers.async_dispatch; "
                "assert 'backend.workers.celery_app' not in sys.modules",
            ],
            check=True,
            capture_output=True,
            text=True,
        )

    def test_eager_mode_does_not_import_celery_tasks(self) -> None:
        with (
            patch("backend.workers.async_dispatch.settings.CELERY_TASK_ALWAYS_EAGER", True),
            patch("backend.workers.async_dispatch.import_module") as import_module,
        ):
            self.assertIsNone(resolve_celery_task("send_email_task"))

        import_module.assert_not_called()

    def test_queue_mode_resolves_task_lazily(self) -> None:
        task = object()
        with (
            patch("backend.workers.async_dispatch.settings.CELERY_TASK_ALWAYS_EAGER", False),
            patch(
                "backend.workers.async_dispatch.import_module",
                return_value=SimpleNamespace(send_email_task=task),
            ) as import_module,
        ):
            self.assertIs(resolve_celery_task("send_email_task"), task)

        import_module.assert_called_once_with("backend.workers.tasks")

    def test_queue_mode_requires_worker_task(self) -> None:
        with (
            patch("backend.workers.async_dispatch.settings.CELERY_TASK_ALWAYS_EAGER", False),
            self.assertRaisesRegex(RuntimeError, "Celery worker extra is required"),
        ):
            dispatch_background_sync_job(
                target=lambda: None,
                kwargs={},
                celery_task=None,
                celery_kwargs={},
                queue="default",
                job_name="test",
            )
