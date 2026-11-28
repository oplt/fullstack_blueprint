"""Structured logging, request correlation and handler configuration."""

from __future__ import annotations

import json
import logging
from contextvars import ContextVar, Token
from datetime import UTC, datetime, timedelta
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

from backend.core.config import settings
from backend.core.observability.redaction import RedactingFilter

_correlation_id: ContextVar[str | None] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> str | None:
    return _correlation_id.get()


def set_correlation_id(value: str) -> Token[str | None]:
    return _correlation_id.set(value)


def reset_correlation_id(token: Token[str | None]) -> None:
    _correlation_id.reset(token)


LOGGING_CONFIGURED_ATTR = "_generic_app_logging_configured"


def resolve_log_file_path(path: str) -> Path:
    log_path = Path(path)
    if not log_path.is_absolute():
        backend_root = Path(__file__).resolve().parents[1]
        log_path = backend_root / log_path
    return log_path


def build_file_handler(log_file: Path) -> TimedRotatingFileHandler:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    handler = TimedRotatingFileHandler(
        filename=str(log_file),
        when="midnight",
        interval=1,
        backupCount=max(settings.LOG_RETENTION_DAYS, 1),
        encoding="utf-8",
        utc=True,
    )
    handler.suffix = "%Y-%m-%d"
    return handler


def cleanup_old_logs(log_file: Path, retention_days: int) -> int:
    """Delete rotated log files older than the retention window.

    Only removes files matching ``<log_file.name>.YYYY-MM-DD`` created by our handler.
    Returns the number of deleted files.
    """
    retention_days = max(retention_days, 1)

    log_dir = log_file.parent
    if not log_dir.exists():
        return 0

    cutoff_date = datetime.now(UTC).date() - timedelta(days=retention_days - 1)
    deleted = 0
    prefix = f"{log_file.name}."

    for path in log_dir.iterdir():
        if path == log_file or not path.is_file():
            continue
        if not path.name.startswith(prefix):
            continue

        date_token = path.name[len(prefix) :].split(".", 1)[0]
        try:
            rotated_date = datetime.strptime(date_token, "%Y-%m-%d").date()
        except ValueError:
            continue

        if rotated_date < cutoff_date:
            path.unlink(missing_ok=True)
            deleted += 1

    return deleted


def attach_handlers(root_logger: logging.Logger) -> Path | None:
    log_file: Path | None = None

    if settings.LOG_TO_CONSOLE:
        console = logging.StreamHandler()
        console.set_name("generic_app.console")
        root_logger.addHandler(console)

    if settings.LOG_TO_FILE:
        log_file = resolve_log_file_path(settings.LOG_FILE_PATH)
        file_handler = build_file_handler(log_file)
        file_handler.set_name("generic_app.file")
        root_logger.addHandler(file_handler)
        cleanup_old_logs(log_file, settings.LOG_RETENTION_DAYS)

    return log_file


class CorrelationContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = get_correlation_id() or "-"
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": getattr(record, "correlation_id", "-"),
        }
        if record.exc_info and record.exc_info[0] is not None:
            payload["exception_type"] = record.exc_info[0].__name__
        return json.dumps(payload, ensure_ascii=True, default=str)


def _build_formatter() -> logging.Formatter:
    if settings.LOG_FORMAT.lower() == "json":
        return JsonFormatter()
    return logging.Formatter(
        fmt="%(asctime)s %(levelname)s [%(name)s] [correlation_id=%(correlation_id)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def setup_logging(*, force: bool = False) -> None:
    """Configure root logging once for API, workers, and scripts."""
    root_logger = logging.getLogger()
    if getattr(root_logger, LOGGING_CONFIGURED_ATTR, False) and not force:
        root_logger.setLevel(settings.LOG_LEVEL.upper())
        return

    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    root_logger.setLevel(settings.LOG_LEVEL.upper())

    formatter = _build_formatter()
    correlation_filter = CorrelationContextFilter()
    redacting_filter = RedactingFilter()

    log_file = attach_handlers(root_logger)
    for handler in root_logger.handlers:
        handler.setFormatter(formatter)
        handler.addFilter(correlation_filter)
        handler.addFilter(redacting_filter)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    startup_logger = logging.getLogger("backend.logging")
    if log_file is not None:
        startup_logger.info(
            "File logging enabled path=%s retention_days=%s",
            log_file,
            settings.LOG_RETENTION_DAYS,
        )
    else:
        startup_logger.info(
            "File logging disabled console=%s level=%s",
            settings.LOG_TO_CONSOLE,
            settings.LOG_LEVEL.upper(),
        )

    setattr(root_logger, LOGGING_CONFIGURED_ATTR, True)
