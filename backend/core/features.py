"""Formal capability registry.

Availability is deliberately separate from authorization. This registry can
remove a router from a deployment or describe a feature to a client, but it
never grants access to a resource or replaces backend permission checks.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.core.config import Settings


@dataclass(frozen=True, slots=True)
class CapabilityDefinition:
    identifier: str
    label: str
    description: str
    dependencies: tuple[str, ...] = ()
    configuration_requirements: tuple[str, ...] = ()
    deployment_flag: str | None = None
    router: str | None = None
    required_permissions: tuple[str, ...] = ()
    background_workers: tuple[str, ...] = ()
    database_dependencies: tuple[str, ...] = ()
    optional_integrations: tuple[str, ...] = ()
    health_checks: tuple[str, ...] = ()
    default_feature_flags: tuple[str, ...] = ()
    module_pack_managed: bool = False
    user_visible: bool = True


@dataclass(frozen=True, slots=True)
class CapabilityManifest:
    identifier: str
    label: str
    description: str
    dependencies: list[str]
    configuration_requirements: list[str]
    required_permissions: list[str]
    background_workers: list[str]
    database_dependencies: list[str]
    optional_integrations: list[str]
    health_checks: list[str]
    default_feature_flags: list[str]
    build_included: bool
    deployment_enabled: bool
    runtime_enabled: bool
    user_visible: bool


class CapabilityRegistry:
    def __init__(self, definitions: tuple[CapabilityDefinition, ...]):
        self._definitions = {item.identifier: item for item in definitions}
        if len(self._definitions) != len(definitions):
            raise ValueError("Capability identifiers must be unique")
        unknown_dependencies = {
            dependency
            for item in definitions
            for dependency in item.dependencies
            if dependency not in self._definitions
        }
        if unknown_dependencies:
            raise ValueError(f"Unknown capability dependencies: {sorted(unknown_dependencies)}")

    def get(self, identifier: str) -> CapabilityDefinition:
        try:
            return self._definitions[identifier]
        except KeyError as exc:
            raise KeyError(f"Unknown capability: {identifier}") from exc

    def all(self) -> tuple[CapabilityDefinition, ...]:
        return tuple(self._definitions.values())

    def deployment_enabled(self, identifier: str, settings: Settings) -> bool:
        definition = self.get(identifier)
        if definition.deployment_flag is not None and not bool(
            getattr(settings, definition.deployment_flag, False)
        ):
            return False
        return all(
            self.deployment_enabled(dependency, settings) for dependency in definition.dependencies
        )

    def manifest(
        self,
        settings: Settings,
        *,
        runtime_enabled: set[str] | None = None,
    ) -> list[CapabilityManifest]:
        enabled_at_runtime = set(self._definitions) if runtime_enabled is None else runtime_enabled
        return [
            CapabilityManifest(
                identifier=item.identifier,
                label=item.label,
                description=item.description,
                dependencies=list(item.dependencies),
                configuration_requirements=list(item.configuration_requirements),
                required_permissions=list(item.required_permissions),
                background_workers=list(item.background_workers),
                database_dependencies=list(item.database_dependencies),
                optional_integrations=list(item.optional_integrations),
                health_checks=list(item.health_checks),
                default_feature_flags=list(item.default_feature_flags),
                build_included=True,
                deployment_enabled=self.deployment_enabled(item.identifier, settings),
                runtime_enabled=item.identifier in enabled_at_runtime,
                user_visible=item.user_visible,
            )
            for item in self.all()
        ]

    def public_metadata(
        self,
        settings: Settings,
        *,
        runtime_enabled: set[str] | None = None,
    ) -> list[dict[str, object]]:
        return [asdict(item) for item in self.manifest(settings, runtime_enabled=runtime_enabled)]


CAPABILITY_REGISTRY = CapabilityRegistry(
    (
        CapabilityDefinition(
            identifier="identity",
            label="Identity and access",
            description="Authentication, sessions, MFA, and authorization subjects.",
            router="backend.modules.identity.auth_routes:router",
            database_dependencies=("users", "refresh_sessions"),
            health_checks=("database", "redis"),
        ),
        CapabilityDefinition(
            identifier="projects",
            label="Projects",
            description="Projects, memberships, tasks, and project access control.",
            dependencies=("identity",),
            deployment_flag="PROJECTS_ENABLED",
            router="backend.modules.projects.router:router",
            required_permissions=("project.viewer", "project.editor", "project.owner"),
            database_dependencies=("projects", "project_members", "project_tasks"),
        ),
        CapabilityDefinition(
            identifier="organizations",
            label="Organizations",
            description="Tenant organizations, memberships, and organization-scoped access.",
            dependencies=("identity",),
            deployment_flag="ORGANIZATIONS_ENABLED",
            router="backend.modules.identity.organizations.router:router",
            required_permissions=("organization.member", "organization.admin"),
            database_dependencies=("organizations", "organization_members"),
        ),
        CapabilityDefinition(
            identifier="platform",
            label="Platform",
            description="Deployment metadata, plans, flags, keys, webhooks, and templates.",
            dependencies=("identity",),
            deployment_flag="PLATFORM_API_ENABLED",
            router="backend.modules.admin.platform.router:router",
            database_dependencies=("app_settings", "feature_flags", "subscription_plans"),
            optional_integrations=("smtp", "outbound_http"),
        ),
        CapabilityDefinition(
            identifier="reusable_capabilities",
            label="Reusable business capabilities",
            description=(
                "Tenant-safe storage, notifications, integrations, search, analytics, "
                "and lifecycle jobs."
            ),
            dependencies=("identity", "platform"),
            configuration_requirements=("INTEGRATIONS_ENABLED", "ANALYTICS_ENABLED"),
            background_workers=("notification-delivery", "webhook-delivery", "lifecycle-jobs"),
            database_dependencies=(
                "storage_objects",
                "tenant_integrations",
                "notification_deliveries",
                "webhook_deliveries",
                "analytics_events",
                "data_lifecycle_jobs",
            ),
            optional_integrations=("s3", "minio", "posthog", "smtp", "outbound_http"),
        ),
        CapabilityDefinition(
            identifier="notifications",
            label="Notifications",
            description="User notification inbox and delivery settings.",
            dependencies=("identity",),
            deployment_flag="NOTIFICATIONS_ENABLED",
            router="backend.modules.notifications.router:router",
            database_dependencies=("notifications",),
        ),
        CapabilityDefinition(
            identifier="settings_api",
            label="Settings API",
            description="Administrative runtime configuration endpoints.",
            dependencies=("identity", "platform"),
            deployment_flag="SETTINGS_API_ENABLED",
            router="backend.modules.admin.settings_routes:router",
        ),
        CapabilityDefinition(
            identifier="admin_api",
            label="Admin API",
            description="Administrative operations.",
            dependencies=("identity", "platform"),
            deployment_flag="ADMIN_API_ENABLED",
            router="backend.modules.admin.router:router",
        ),
        CapabilityDefinition(
            identifier="ai",
            label="AI",
            description="Providers, prompts, runs, agents, reviews, and evaluations.",
            dependencies=("identity",),
            configuration_requirements=("AI_ENABLED",),
            deployment_flag="AI_ENABLED",
            router="backend.modules.ai.router:router",
            module_pack_managed=True,
            required_permissions=("ai.run", "ai.admin"),
            background_workers=("ai-evaluation",),
            database_dependencies=(
                "ai_runs",
                "ai_prompt_templates",
                "ai_evaluation_datasets",
                "ai_agent_definitions",
                "ai_workflow_runs",
                "ai_tool_approvals",
                "ai_tool_executions",
                "ai_mcp_servers",
            ),
            optional_integrations=(
                "openai",
                "anthropic",
                "local_model",
                "mcp",
                "temporal",
            ),
        ),
        CapabilityDefinition(
            identifier="agents",
            label="AI agents",
            description="Agent tools, approvals, and execution endpoints.",
            dependencies=("ai",),
            configuration_requirements=("AI_MCP_ENABLED",),
            deployment_flag="AI_MCP_ENABLED",
            router="backend.modules.agents.router:router",
            required_permissions=("ai.run", "ai.admin"),
            background_workers=("agent-execution",),
        ),
        CapabilityDefinition(
            identifier="rag",
            label="Retrieval augmented generation",
            description="Documents, revisions, ingestion, indexing, retrieval, and citations.",
            dependencies=("identity", "projects"),
            configuration_requirements=("RAG_ENABLED",),
            deployment_flag="RAG_ENABLED",
            router="backend.modules.rag.router:router",
            required_permissions=("rag.read", "rag.write"),
            background_workers=("rag-indexing", "rag-document-cleanup"),
            database_dependencies=(
                "rag_documents",
                "rag_document_revisions",
                "rag_chunks",
                "rag_embedding_models",
                "rag_index_versions",
                "rag_chunk_embeddings",
            ),
            optional_integrations=(
                "pgvector",
                "object_storage",
                "embedding_provider",
                "docling",
                "clamd",
            ),
            health_checks=("rag_index",),
        ),
        CapabilityDefinition(
            identifier="memory",
            label="Memory",
            description="User and project memory policy, storage, and audit history.",
            dependencies=("identity",),
            configuration_requirements=("MEMORY_ENABLED",),
            deployment_flag="MEMORY_ENABLED",
            router="backend.modules.memory.router:router",
            required_permissions=("memory.read", "memory.write"),
            background_workers=("memory-extraction",),
            database_dependencies=("memory_registry", "memory_audit_logs"),
            optional_integrations=("mem0", "memory_policy", "memory_retention"),
        ),
        CapabilityDefinition(
            identifier="calendar",
            label="Calendar",
            description="Calendar entries and project-linked planning items.",
            dependencies=("identity", "projects"),
            configuration_requirements=("CALENDAR_ENABLED",),
            deployment_flag="CALENDAR_ENABLED",
            router="backend.modules.calendar.router:router",
            required_permissions=("calendar.read", "calendar.write"),
            database_dependencies=("calendar_entries",),
        ),
        CapabilityDefinition(
            identifier="observability",
            label="Observability",
            description="Metrics, traces, and operational status views.",
            dependencies=("identity",),
            configuration_requirements=("OBSERVABILITY_ENABLED",),
            deployment_flag="OBSERVABILITY_ENABLED",
            router="backend.modules.observability.router:router",
            required_permissions=("observability.read",),
            health_checks=("metrics", "traces"),
        ),
        CapabilityDefinition(
            identifier="billing",
            label="Billing",
            description="Plans, subscriptions, and entitlement inputs.",
            dependencies=("identity", "platform"),
            module_pack_managed=True,
            required_permissions=("billing.read", "billing.manage"),
            database_dependencies=("subscription_plans", "user_subscriptions"),
        ),
        CapabilityDefinition(
            identifier="webhooks",
            label="Webhooks",
            description="Configured outbound event delivery endpoints.",
            dependencies=("identity", "platform"),
            module_pack_managed=True,
            required_permissions=("webhooks.read", "webhooks.manage"),
            database_dependencies=("webhook_endpoints",),
            optional_integrations=("outbound_http",),
        ),
        CapabilityDefinition(
            identifier="api_keys",
            label="API Keys",
            description="User-managed credentials for integrations and automation.",
            dependencies=("identity", "platform"),
            module_pack_managed=True,
            required_permissions=("api_keys.read", "api_keys.manage"),
            database_dependencies=("api_keys",),
        ),
        CapabilityDefinition(
            identifier="feature_flags",
            label="Feature Flags",
            description="Runtime rollout controls for features and experiments.",
            dependencies=("identity", "platform"),
            module_pack_managed=True,
            required_permissions=("feature_flags.read", "feature_flags.manage"),
            database_dependencies=("feature_flags",),
        ),
        CapabilityDefinition(
            identifier="email_templates",
            label="Email Templates",
            description="Customizable transactional email content.",
            dependencies=("identity", "platform"),
            module_pack_managed=True,
            required_permissions=("email_templates.read", "email_templates.manage"),
            database_dependencies=("email_templates",),
            optional_integrations=("smtp",),
            user_visible=False,
        ),
    )
)
