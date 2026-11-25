---
name: permission
description: Add or change a backend authorization permission.
---

Name the permission narrowly and document the actor/resource/action decision.
Enforce it in the service and retrieval boundary, expose it only through existing
auth metadata, and add allow/deny tests for every role and tenant. Availability,
flags, and entitlements never replace authorization.
