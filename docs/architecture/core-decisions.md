# Backend core migration decisions

Section 6 moves operational HTTP composition into `backend/api` and shared telemetry into `backend/core/observability`. For ambiguous merges, an independent provider lifecycle, authorization boundary or import-time side effect takes precedence over reducing the file count.

| Previous owner | Decision and reason |
| --- | --- |
| `core/logging/{log_context,logging,log_handlers}.py` | Merge correlation context, formatter setup and handler lifecycle into `core/observability/logging.py`. API middleware and Celery hooks use the same context variable. |
| `core/logging/{log_redaction,log_timing}.py` | Move to `redaction.py` and `timing.py` under observability. Each can be used independently of root logger configuration. Remove the former logging package. |
| `observability/{instruments,metrics,prometheus_metrics}.py` | Merge instrument helpers into `metrics.py`. Retain `prometheus_metrics.py` because importing it registers collectors globally. API, database and worker callers load these definitions on demand and handle an unavailable Prometheus client. |
| `observability/{otel,tracing,config,setup}.py` | Put OTLP export, instrumentation guards and the existing tracing entry point in `tracing.py`. Put settings resolution and runtime setup in `setup.py`, retaining the Sentry → metrics → tracing initialization order. Keep the Sentry SDK adapter separate. |
| `core/health.py` | Move the four existing health probes to `core/observability/health.py`. Preserve timeouts, production visibility and readiness status codes. |
| `core/openapi.py`, `modules/observability/router.py` | Move to `api/openapi.py` and `api/observability.py`. The API layer owns the identity dependency for status and links. The existing capability flag controls router registration. Include the moved adapter in route persistence checks. |
| `core/{cache,resource_cache}.py` | Retain both. Resource list serialization, scoped keys and invalidation reuse the generic Redis and local cache implementation. |
| Request logging and audit persistence | Keep the single HTTP logging middleware and the separately invoked database audit writer. They have different failure and transaction boundaries. |
| Vector calculations, SQL vector search and RAG vector persistence | Retain their existing owners. Pure calculations, database operations and tenant-scoped document storage have different dependencies. |

The affected Python inventory goes from 21 source files to 14. This counts the old logging and operational-route packages, observability, health and OpenAPI at their original and destination paths. Two Python packages disappear.

Deploy the moves and their import updates together in each API or worker artifact. Existing and updated processes can overlap because HTTP contracts, queue messages, Redis keys and database schemas stay compatible. Rollback uses the previous complete application artifact.
