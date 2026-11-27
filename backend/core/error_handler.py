import logging
from http import HTTPStatus

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError

from backend.core.api_contracts import problem_response

logger = logging.getLogger("backend.error")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(request: Request, exc: RequestValidationError):
        logger.warning(
            "request_validation_failed path=%s correlation_id=%s errors=%s",
            request.url.path,
            getattr(request.state, "correlation_id", None),
            len(exc.errors()),
        )
        return problem_response(
            request,
            status=422,
            title="Request validation failed",
            detail="Request validation failed",
            errors=[
                {"loc": error["loc"], "msg": error["msg"], "type": error["type"]}
                for error in exc.errors()
            ],
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        logger.warning(
            "value_error path=%s correlation_id=%s detail=%s",
            request.url.path,
            getattr(request.state, "correlation_id", None),
            str(exc)[:200],
        )
        return problem_response(
            request,
            status=400,
            title="Bad request",
            detail=str(exc),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        if exc.status_code >= HTTPStatus.INTERNAL_SERVER_ERROR:
            logger.error(
                "http_exception path=%s status=%s correlation_id=%s detail=%s",
                request.url.path,
                exc.status_code,
                getattr(request.state, "correlation_id", None),
                str(exc.detail)[:200],
            )
        elif exc.status_code >= HTTPStatus.BAD_REQUEST:
            logger.warning(
                "http_exception path=%s status=%s correlation_id=%s detail=%s",
                request.url.path,
                exc.status_code,
                getattr(request.state, "correlation_id", None),
                str(exc.detail)[:200],
            )
        return problem_response(
            request,
            status=exc.status_code,
            title="HTTP error",
            detail=str(exc.detail),
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, _exc: Exception):
        logger.exception(
            "unhandled_exception path=%s correlation_id=%s",
            request.url.path,
            getattr(request.state, "correlation_id", None),
        )
        return problem_response(
            request,
            status=500,
            title="Internal server error",
            detail="Internal server error",
        )
