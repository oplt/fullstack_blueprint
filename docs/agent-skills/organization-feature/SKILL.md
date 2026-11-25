---
name: organization-feature
description: Implement an organization or tenant-scoped business feature.
---

Derive the tenant from trusted auth context, enforce membership/role at every read
and write boundary, include tenant keys in queries and uniqueness constraints, and
never trust a client organization ID alone. Test owner/editor/viewer behavior,
foreign-tenant access, indexing/retrieval, and deletion.
