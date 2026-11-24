# Blueprint configuration and product presets

Phase 15 centralizes frontend product configuration in `src/app/configuration/`. The configuration is typed, serializable, and consumable by a generated application without splitting the frontend into multiple packages.

## Ownership boundaries

| Concern | Owner | Client behavior |
| --- | --- | --- |
| Build-time module selection | Vite/generator (`VITE_BLUEPRINT_CAPABILITIES`) | Excludes capabilities from the generated navigation and route surface; optional pages remain lazy. |
| Deployment availability | Deployment configuration and platform metadata | Hides unavailable capabilities and prevents their route elements from rendering. |
| Runtime feature flags | Backend/platform service | `available_features` and optional `feature_flags` control visibility; the client never turns a server flag on. |
| User permissions | Backend authorization | Optional server-supplied permissions can narrow the UI. Every API and route remains server-authoritative. |
| Commercial entitlements | Backend billing/entitlement service | Optional server-supplied entitlements can narrow the UI. The client does not grant access based on a local value. |

`capabilityAvailability()` returns the decision and human-readable reasons so generated shells and tests can explain why a capability is absent. Missing optional permission/entitlement fields preserve compatibility with the current backend; protected requests still rely on backend authorization.

## Presets

`minimal`, `saas`, `ai-saas`, `knowledge-platform`, `automation-platform`, `enterprise`, and `internal-business` are defined in `PRESET_CAPABILITIES`. The default `enterprise` preset preserves the existing full application surface while server metadata still gates optional features. Backend module pack keys remain compatible with the platform service: `lean_saas`, `automation_suite`, `client_portal`, and `full_platform`.

Build a smaller generated application by setting a comma-separated allowlist before Vite runs:

```sh
VITE_BLUEPRINT_CAPABILITIES=dashboard,projects,calendar npm run build
```

The same choice can be supplied by a Copier template through `createApplicationConfiguration({ preset, build, branding, navigation })`. The `AppProviders` `configuration` prop is the integration point for a generated application's application name, logo, theme preset, default language, navigation, capabilities, and layout variants.

## Copier integration

A future Copier template should render a small `frontend/src/app/configuration/generated.ts` file (or an environment file) containing only serializable overrides, then pass it to `AppProviders`. Keep capability identifiers aligned with `CAPABILITY_MANIFESTS`, retain backend module-pack names, and leave permissions/entitlements in deployment-provided metadata. Copier should choose build-time capabilities; platform administration should choose deployment modules; the server remains the authority at runtime.

Do not import optional feature components from the generated configuration. Route components are already React-lazy boundaries and are only rendered after the capability resolver allows them.
