# Generated API contract

The OpenAPI document and TypeScript schema/path types are generated. Run `npm run api:generate:all` from `frontend/` after changing backend routes or schemas. API requests use the shared authenticated transport in `src/lib/api.ts`; generated types do not create a second client. The contract profile enables all optional backend routers so the generated surface stays stable; runtime feature flags and authorization remain enforced by the backend.
