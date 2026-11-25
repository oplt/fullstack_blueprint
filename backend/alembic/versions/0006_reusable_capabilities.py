"""Reusable storage, integrations, delivery, analytics, and lifecycle records."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_reusable_capabilities"
down_revision: str | Sequence[str] | None = "0005_advanced_rag_memory"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _add_existing_column(table: str, column: sa.Column) -> None:
    op.add_column(table, column)


def upgrade() -> None:
    op.create_table(
        "storage_objects",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=True),
        sa.Column("object_key", sa.String(length=1024), nullable=False),
        sa.Column("original_filename", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("retention_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id", "object_key", name="uq_storage_object_owner_key"),
    )
    op.create_index("ix_storage_objects_owner_id", "storage_objects", ["owner_id"])
    op.create_index("ix_storage_objects_tenant_id", "storage_objects", ["tenant_id"])
    op.create_index("ix_storage_objects_status", "storage_objects", ["status"])
    op.create_index("ix_storage_objects_checksum_sha256", "storage_objects", ["checksum_sha256"])

    op.create_table(
        "integration_definitions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("provider", sa.String(length=128), nullable=False),
        sa.Column("required_scopes_json", sa.JSON(), nullable=False),
        sa.Column("allowed_hosts_json", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_index("ix_integration_definitions_key", "integration_definitions", ["key"])

    op.create_table(
        "tenant_integrations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=False),
        sa.Column("installed_by_user_id", sa.String(), nullable=False),
        sa.Column("integration_definition_id", sa.String(), nullable=False),
        sa.Column("encrypted_credentials", sa.Text(), nullable=True),
        sa.Column("granted_scopes_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("health_status", sa.String(length=32), nullable=False),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["installed_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["integration_definition_id"], ["integration_definitions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "integration_definition_id", name="uq_tenant_integration"),
    )
    op.create_index("ix_tenant_integrations_tenant_id", "tenant_integrations", ["tenant_id"])
    op.create_index("ix_tenant_integrations_status", "tenant_integrations", ["status"])
    op.create_index(
        "ix_tenant_integrations_installed_by_user_id",
        "tenant_integrations",
        ["installed_by_user_id"],
    )
    op.create_index(
        "ix_tenant_integrations_integration_definition_id",
        "tenant_integrations",
        ["integration_definition_id"],
    )

    op.create_table(
        "integration_audit_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=False),
        sa.Column("integration_id", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["integration_id"], ["tenant_integrations.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_integration_audit_events_tenant_id", "integration_audit_events", ["tenant_id"]
    )
    op.create_index(
        "ix_integration_audit_events_integration_id", "integration_audit_events", ["integration_id"]
    )
    op.create_index("ix_integration_audit_events_user_id", "integration_audit_events", ["user_id"])
    op.create_index("ix_integration_audit_events_action", "integration_audit_events", ["action"])
    op.create_index(
        "ix_integration_audit_events_created_at", "integration_audit_events", ["created_at"]
    )

    op.create_table(
        "analytics_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=True),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("organization_id", sa.String(), nullable=True),
        sa.Column("event_name", sa.String(length=128), nullable=False),
        sa.Column("properties_json", sa.JSON(), nullable=False),
        sa.Column("dedupe_key", sa.String(length=255), nullable=True),
        sa.Column("provider_status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "dedupe_key", name="uq_analytics_event_dedupe"),
    )
    op.create_index("ix_analytics_events_tenant_id", "analytics_events", ["tenant_id"])
    op.create_index("ix_analytics_events_event_name", "analytics_events", ["event_name"])
    op.create_index("ix_analytics_events_user_id", "analytics_events", ["user_id"])
    op.create_index("ix_analytics_events_organization_id", "analytics_events", ["organization_id"])
    op.create_index("ix_analytics_events_created_at", "analytics_events", ["created_at"])

    op.create_table(
        "data_lifecycle_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(length=128), nullable=False),
        sa.Column("requested_by_user_id", sa.String(), nullable=False),
        sa.Column("operation", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("progress_percent", sa.Integer(), nullable=False),
        sa.Column("result_object_id", sa.String(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "idempotency_key", name="uq_lifecycle_tenant_idempotency"),
    )
    op.create_index("ix_data_lifecycle_jobs_tenant_id", "data_lifecycle_jobs", ["tenant_id"])
    op.create_index("ix_data_lifecycle_jobs_status", "data_lifecycle_jobs", ["status"])
    op.create_index(
        "ix_data_lifecycle_jobs_requested_by_user_id",
        "data_lifecycle_jobs",
        ["requested_by_user_id"],
    )
    op.create_index("ix_data_lifecycle_jobs_operation", "data_lifecycle_jobs", ["operation"])

    _add_existing_column(
        "notifications",
        sa.Column("channel", sa.String(32), nullable=False, server_default=sa.text("'in_app'")),
    )
    _add_existing_column("notifications", sa.Column("template_key", sa.String(128), nullable=True))
    _add_existing_column(
        "notifications",
        sa.Column("locale", sa.String(16), nullable=False, server_default=sa.text("'en'")),
    )
    _add_existing_column("notifications", sa.Column("dedupe_key", sa.String(255), nullable=True))
    _add_existing_column(
        "notifications",
        sa.Column(
            "delivery_status", sa.String(32), nullable=False, server_default=sa.text("'delivered'")
        ),
    )
    _add_existing_column(
        "notifications",
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
    )
    _add_existing_column("notifications", sa.Column("last_error", sa.Text(), nullable=True))
    _add_existing_column(
        "notifications", sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True)
    )
    for name in ("channel", "locale", "delivery_status", "attempt_count"):
        op.alter_column("notifications", name, server_default=None)
    op.create_unique_constraint("uq_notifications_dedupe_key", "notifications", ["dedupe_key"])
    op.create_index("ix_notifications_delivery_status", "notifications", ["delivery_status"])

    _add_existing_column(
        "notification_preferences",
        sa.Column("locale", sa.String(16), nullable=False, server_default=sa.text("'en'")),
    )
    op.alter_column("notification_preferences", "locale", server_default=None)

    _add_existing_column("api_keys", sa.Column("tenant_id", sa.String(128), nullable=True))
    _add_existing_column(
        "api_keys",
        sa.Column("scopes_json", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    _add_existing_column(
        "api_keys", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True)
    )
    _add_existing_column("api_keys", sa.Column("rotated_from_id", sa.String(), nullable=True))
    _add_existing_column(
        "api_keys",
        sa.Column(
            "rate_limit_per_minute", sa.Integer(), nullable=False, server_default=sa.text("60")
        ),
    )
    op.alter_column("api_keys", "scopes_json", server_default=None)
    op.alter_column("api_keys", "rate_limit_per_minute", server_default=None)
    op.create_index("ix_api_keys_tenant_id", "api_keys", ["tenant_id"])
    op.create_index("ix_api_keys_expires_at", "api_keys", ["expires_at"])

    op.create_table(
        "notification_deliveries",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("notification_id", sa.String(), nullable=False),
        sa.Column("channel", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["notification_id"], ["notifications.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("notification_id", "channel", name="uq_notification_delivery_channel"),
    )
    op.create_index(
        "ix_notification_deliveries_notification_id", "notification_deliveries", ["notification_id"]
    )
    op.create_index("ix_notification_deliveries_status", "notification_deliveries", ["status"])

    op.create_table(
        "webhook_deliveries",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("webhook_id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(255), nullable=False),
        sa.Column("event_version", sa.String(32), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("response_status", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["webhook_id"], ["webhook_endpoints.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("webhook_id", "event_id", name="uq_webhook_delivery_event"),
    )
    op.create_index("ix_webhook_deliveries_webhook_id", "webhook_deliveries", ["webhook_id"])
    op.create_index("ix_webhook_deliveries_event_id", "webhook_deliveries", ["event_id"])
    op.create_index("ix_webhook_deliveries_status", "webhook_deliveries", ["status"])


def downgrade() -> None:
    raise RuntimeError("Reusable capability records must be retained; use a forward migration.")
