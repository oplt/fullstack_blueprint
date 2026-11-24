import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from backend.core.config import settings
from backend.workers.async_dispatch import dispatch_background_sync_job, run_async_in_sync_context

logger = logging.getLogger(__name__)


async def send_email(
    *, to: str, subject: str, html_body: str, text_body: str | None = None
) -> None:
    if not settings.SMTP_HOST:
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    if text_body:
        message.attach(MIMEText(text_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            use_tls=settings.SMTP_TLS,
        )
    except (OSError, aiosmtplib.SMTPException) as exc:
        logger.warning("SMTP delivery failed error_type=%s", type(exc).__name__)
        raise
    logger.info("Email delivered")


def send_email_sync(*, to: str, subject: str, html_body: str, text_body: str | None = None) -> None:
    run_async_in_sync_context(
        send_email(to=to, subject=subject, html_body=html_body, text_body=text_body)
    )


def queue_email(*, to: str, subject: str, html_body: str, text_body: str | None = None) -> None:
    if not settings.SMTP_HOST:
        return
    from backend.workers.tasks import send_email_task

    payload = {
        "to": to,
        "subject": subject,
        "html_body": html_body,
        "text_body": text_body,
    }
    dispatch_background_sync_job(
        target=send_email_sync,
        kwargs=payload,
        celery_task=send_email_task,
        celery_kwargs=payload,
        queue=settings.CELERY_EMAIL_QUEUE,
        job_name="email",
    )
