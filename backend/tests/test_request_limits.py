import unittest

import pytest

from backend.core.middleware.request_limits import RequestBodyLimitMiddleware


@pytest.mark.asyncio
async def test_chunked_overflow_returns_one_413_without_delivering_overflow_to_app(monkeypatch):
    from backend.core.middleware import request_limits

    monkeypatch.setattr(request_limits.settings, "MAX_REQUEST_BODY_BYTES", 3)
    delivered = []
    responses = []
    incoming = iter(
        [
            {"type": "http.request", "body": b"abc", "more_body": True},
            {"type": "http.request", "body": b"d", "more_body": False},
        ]
    )

    async def receive():
        return next(incoming)

    async def send(message):
        responses.append(message)

    async def app(_scope, wrapped_receive, _app_send):
        delivered.append(await wrapped_receive())
        delivered.append(await wrapped_receive())

    middleware = RequestBodyLimitMiddleware(app)
    await middleware({"type": "http", "headers": []}, receive, send)

    unittest.TestCase().assertEqual(
        [message["status"] for message in responses if message["type"] == "http.response.start"],
        [413],
    )
    unittest.TestCase().assertEqual(len(delivered), 1)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("headers", "expected_status"),
    [([(b"content-length", b"-1")], 400), ([(b"content-length", b"4")], 413)],
)
async def test_invalid_or_oversized_content_length_is_rejected(
    headers, expected_status, monkeypatch
):
    from backend.core.middleware import request_limits

    monkeypatch.setattr(request_limits.settings, "MAX_REQUEST_BODY_BYTES", 3)
    responses = []

    async def receive():
        raise AssertionError("body must not be read after header rejection")

    async def send(message):
        responses.append(message)

    async def app(_scope, _app_receive, _app_send):
        raise AssertionError("app must not run after header rejection")

    await RequestBodyLimitMiddleware(app)({"type": "http", "headers": headers}, receive, send)

    unittest.TestCase().assertEqual(
        next(
            message["status"] for message in responses if message["type"] == "http.response.start"
        ),
        expected_status,
    )


@pytest.mark.asyncio
async def test_overflow_after_response_start_finishes_without_a_second_status(monkeypatch):
    from backend.core.middleware import request_limits

    monkeypatch.setattr(request_limits.settings, "MAX_REQUEST_BODY_BYTES", 3)
    responses = []
    incoming = iter(
        [
            {"type": "http.request", "body": b"abcd", "more_body": False},
        ]
    )

    async def receive():
        return next(incoming)

    async def send(message):
        responses.append(message)

    async def app(_scope, app_receive, app_send):
        await app_send({"type": "http.response.start", "status": 202, "headers": []})
        await app_receive()

    await RequestBodyLimitMiddleware(app)({"type": "http", "headers": []}, receive, send)

    starts = [message for message in responses if message["type"] == "http.response.start"]
    testcase = unittest.TestCase()
    testcase.assertEqual(len(starts), 1)
    testcase.assertEqual(starts[0]["status"], 202)
    testcase.assertEqual(responses[-1], {"type": "http.response.body", "body": b""})


@pytest.mark.asyncio
async def test_chunked_overflow_through_fastapi_returns_413(monkeypatch):
    from fastapi import FastAPI, Request

    from backend.core.middleware import request_limits

    monkeypatch.setattr(request_limits.settings, "MAX_REQUEST_BODY_BYTES", 3)
    app = FastAPI()
    app.add_middleware(RequestBodyLimitMiddleware)

    @app.post("/")
    async def receive_body(request: Request):
        return {"length": len(await request.body())}

    messages = iter(
        [
            {"type": "http.request", "body": b"abc", "more_body": True},
            {"type": "http.request", "body": b"d", "more_body": False},
        ]
    )
    responses = []

    async def receive():
        return next(messages)

    async def send(message):
        responses.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/",
        "raw_path": b"/",
        "query_string": b"",
        "root_path": "",
        "headers": [(b"content-type", b"application/octet-stream")],
        "client": ("127.0.0.1", 1234),
        "server": ("test", 80),
    }
    await app(scope, receive, send)

    status = next(
        message["status"] for message in responses if message["type"] == "http.response.start"
    )
    unittest.TestCase().assertEqual(status, 413)
