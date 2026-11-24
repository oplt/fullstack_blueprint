FROM ghcr.io/astral-sh/uv:0.10 AS uv
FROM python:3.14-slim
COPY --from=uv /uv /usr/local/bin/uv
WORKDIR /app
ENV PYTHONPATH=/app PYTHONUNBUFFERED=1 PATH="/app/backend/.venv/bin:$PATH"
COPY backend/pyproject.toml backend/uv.lock /app/backend/
ARG UV_EXTRAS=""
RUN cd backend && uv sync --locked --no-dev --no-install-project $UV_EXTRAS
COPY backend /app/backend
RUN useradd --create-home blueprint && chown blueprint:blueprint /app
USER blueprint
EXPOSE 8000
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers"]
