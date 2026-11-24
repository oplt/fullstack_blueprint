# Local observability

The core development workflow uses application logs and health endpoints. Run Prometheus, Grafana, and Tempo separately when you need metrics and tracing. Start with the configurations in this directory and adjust host ports or storage paths for your installation.

- Prometheus scrapes `http://localhost:8000/metrics` using `prometheus/prometheus.yml`.
- Tempo reads `tempo/tempo.yml` and accepts local OTLP HTTP on port 4318 and gRPC on port 4317.
- Grafana uses `grafana/provisioning` and imports the application dashboard from `grafana/dashboards`. Update the dashboard provisioner's local path for your Grafana process.

To enable backend instrumentation and the frontend status page, set:

```dotenv
OBSERVABILITY_ENABLED=true
PROMETHEUS_METRICS_ENABLED=true
OTEL_SERVICE_NAME=fullstack-blueprint
OTEL_TRACES_EXPORTER=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
GRAFANA_PUBLIC_URL=http://localhost:3001
PROMETHEUS_PUBLIC_URL=http://localhost:9090
TEMPO_PUBLIC_URL=http://localhost:3200
```

Restart the backend, make requests to `/health/live`, and check Prometheus targets and Grafana Explore. Set `SENTRY_DSN` separately if you use Sentry. Keep scrape and tracing endpoints within the trusted observability network.
