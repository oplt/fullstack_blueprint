# Production security runbook

Before deployment, set a unique high-entropy `JWT_SECRET`, `APP_ENV=production`,
`COOKIE_SECURE=true`, `COOKIE_SAMESITE=lax` or `strict`, `LOG_FORMAT=json`,
`RATE_LIMIT_FAIL_OPEN=false`, explicit `CORS_ALLOWED_ORIGINS`, and explicit
`ALLOWED_HOSTS`. Set `TRUSTED_PROXY_IPS` only to the actual proxy addresses.

Configure secret values through the deployment secret store, never through a client
bundle or committed environment file. Keep `STORAGE_PUBLIC_READ=false`, configure
exact `WEBHOOK_ALLOWED_HOSTS`, and enable required malware scanning for untrusted
uploads. The application validates these settings at import/startup and refuses
unsafe production combinations.

Check `/health/live` from the load balancer and keep `/health/ready`, `/health/workers`,
and `/metrics` on a private network. Alert on 5xx rate, rate-limit unavailability,
DB pool saturation/timeouts, queue age/depth, webhook dead letters, AI cost/latency,
and RAG retrieval degradation.
