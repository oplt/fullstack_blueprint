---
name: webhook
description: Add a signed, idempotent webhook event and delivery flow.
---

Version the payload, sign the exact canonical body with a timestamp, verify replay
age, validate endpoints, deduplicate event IDs, persist attempts, retry with bounded
backoff, and dead-letter permanently failed deliveries. Test forgery, replay,
tenant ownership, duplicate enqueue, and response classification.
