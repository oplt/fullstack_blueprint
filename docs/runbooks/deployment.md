# Deployment and rollback

1. Build the immutable backend image from the locked repository.
2. Run the one-shot migration job against a backup/verified target:
   `docker compose --profile ops run --rm migrate`.
3. Deploy the API image with the new configuration and wait for `/health/ready`.
4. Scale API replicas independently from Celery workers. Workers use late
   acknowledgements, bounded prefetch, task time limits, and Redis health markers.
5. Run smoke tests, inspect error/latency/queue dashboards, and retain the prior
   image until the observation window closes.

For rollback, stop promotion, route traffic to the prior compatible image, and keep
the forward migration in place. Database migrations are additive/forward-fix; do not
run destructive downgrades. Restore from the verified backup only when a forward fix
cannot preserve data. Compose remains the local/small-deployment default; Coolify,
Dokploy, or managed container/PostgreSQL/Redis services are optional targets. Kubernetes
is not required.
