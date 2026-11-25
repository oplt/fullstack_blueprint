FROM ghcr.io/astral-sh/uv:0.10 AS uv
FROM python:3.14-slim AS builder
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_PYTHON_DOWNLOADS=never UV_COMPILE_BYTECODE=1
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
ARG UV_EXTRAS=""
RUN uv sync --locked --no-dev --no-install-project $UV_EXTRAS

FROM python:3.14-slim AS runtime
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app
ENV PYTHONPATH=/app PYTHONUNBUFFERED=1 PATH="/app/backend/.venv/bin:$PATH"
COPY --from=builder /app/backend/.venv /app/backend/.venv
COPY backend /app/backend
RUN useradd --create-home blueprint && chown blueprint:blueprint /app
USER blueprint
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/live', timeout=3)"
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers"]
