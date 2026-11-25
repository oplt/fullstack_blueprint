
/**
 * GENERATED FILE. Do not edit manually.
 * Source: backend/scripts/export_openapi.py (all optional routers enabled).
 */

export type ApiPaths = {
  "/api/v1/admin/audit-logs": {
    get: {"operationId":"list_audit_logs_api_v1_admin_audit_logs_get","tags":["admin"]};
  };
  "/api/v1/admin/metrics": {
    get: {"operationId":"get_metrics_api_v1_admin_metrics_get","tags":["admin"]};
  };
  "/api/v1/admin/users": {
    get: {"operationId":"list_users_api_v1_admin_users_get","tags":["admin"]};
  };
  "/api/v1/admin/users/{user_id}": {
    get: {"operationId":"get_user_api_v1_admin_users__user_id__get","tags":["admin"]};
  };
  "/api/v1/admin/users/{user_id}/status": {
    patch: {"operationId":"update_user_status_api_v1_admin_users__user_id__status_patch","tags":["admin"]};
  };
  "/api/v1/agent/definitions": {
    get: {"operationId":"list_agent_definitions_api_v1_agent_definitions_get","tags":["agent"]};
    post: {"operationId":"create_agent_definition_api_v1_agent_definitions_post","tags":["agent"]};
  };
  "/api/v1/agent/runs": {
    get: {"operationId":"list_agent_runs_api_v1_agent_runs_get","tags":["agent"]};
    post: {"operationId":"create_agent_run_api_v1_agent_runs_post","tags":["agent"]};
  };
  "/api/v1/agent/runs/{run_id}": {
    get: {"operationId":"get_agent_run_api_v1_agent_runs__run_id__get","tags":["agent"]};
  };
  "/api/v1/agent/workflow-runs": {
    post: {"operationId":"start_agent_workflow_api_v1_agent_workflow_runs_post","tags":["agent"]};
  };
  "/api/v1/agent/workflow-runs/{workflow_id}": {
    get: {"operationId":"get_agent_workflow_api_v1_agent_workflow_runs__workflow_id__get","tags":["agent"]};
  };
  "/api/v1/agent/workflow-runs/{workflow_id}/approvals/{approval_id}": {
    post: {"operationId":"approve_agent_workflow_api_v1_agent_workflow_runs__workflow_id__approvals__approval_id__post","tags":["agent"]};
  };
  "/api/v1/agent/workflow-runs/{workflow_id}/cancel": {
    post: {"operationId":"cancel_agent_workflow_api_v1_agent_workflow_runs__workflow_id__cancel_post","tags":["agent"]};
  };
  "/api/v1/agent/workflow-runs/{workflow_id}/resume": {
    post: {"operationId":"resume_agent_workflow_api_v1_agent_workflow_runs__workflow_id__resume_post","tags":["agent"]};
  };
  "/api/v1/ai/documents": {
    get: {"operationId":"list_documents_api_v1_ai_documents_get","tags":["ai"]};
    post: {"operationId":"create_document_api_v1_ai_documents_post","tags":["ai"]};
  };
  "/api/v1/ai/documents/{document_id}": {
    get: {"operationId":"get_document_api_v1_ai_documents__document_id__get","tags":["ai"]};
  };
  "/api/v1/ai/documents/upload": {
    post: {"operationId":"upload_document_api_v1_ai_documents_upload_post","tags":["ai"]};
  };
  "/api/v1/ai/evaluation-datasets": {
    get: {"operationId":"list_datasets_api_v1_ai_evaluation_datasets_get","tags":["ai"]};
    post: {"operationId":"create_dataset_api_v1_ai_evaluation_datasets_post","tags":["ai"]};
  };
  "/api/v1/ai/evaluation-datasets/{dataset_id}": {
    patch: {"operationId":"update_dataset_api_v1_ai_evaluation_datasets__dataset_id__patch","tags":["ai"]};
  };
  "/api/v1/ai/evaluation-datasets/{dataset_id}/cases": {
    get: {"operationId":"list_dataset_cases_api_v1_ai_evaluation_datasets__dataset_id__cases_get","tags":["ai"]};
    post: {"operationId":"create_dataset_case_api_v1_ai_evaluation_datasets__dataset_id__cases_post","tags":["ai"]};
  };
  "/api/v1/ai/evaluation-datasets/{dataset_id}/run": {
    post: {"operationId":"run_evaluation_api_v1_ai_evaluation_datasets__dataset_id__run_post","tags":["ai"]};
  };
  "/api/v1/ai/evaluation-runs": {
    get: {"operationId":"list_evaluation_runs_api_v1_ai_evaluation_runs_get","tags":["ai"]};
  };
  "/api/v1/ai/overview": {
    get: {"operationId":"get_overview_api_v1_ai_overview_get","tags":["ai"]};
  };
  "/api/v1/ai/prompts": {
    get: {"operationId":"list_prompt_templates_api_v1_ai_prompts_get","tags":["ai"]};
    post: {"operationId":"create_prompt_template_api_v1_ai_prompts_post","tags":["ai"]};
  };
  "/api/v1/ai/prompts/{template_id}": {
    patch: {"operationId":"update_prompt_template_api_v1_ai_prompts__template_id__patch","tags":["ai"]};
  };
  "/api/v1/ai/prompts/{template_id}/versions": {
    get: {"operationId":"list_prompt_versions_api_v1_ai_prompts__template_id__versions_get","tags":["ai"]};
    post: {"operationId":"create_prompt_version_api_v1_ai_prompts__template_id__versions_post","tags":["ai"]};
  };
  "/api/v1/ai/prompts/{template_id}/versions/{version_id}": {
    patch: {"operationId":"update_prompt_version_api_v1_ai_prompts__template_id__versions__version_id__patch","tags":["ai"]};
  };
  "/api/v1/ai/providers": {
    get: {"operationId":"list_providers_api_v1_ai_providers_get","tags":["ai"]};
  };
  "/api/v1/ai/retrieve": {
    post: {"operationId":"retrieve_chunks_api_v1_ai_retrieve_post","tags":["ai"]};
  };
  "/api/v1/ai/reviews": {
    get: {"operationId":"list_reviews_api_v1_ai_reviews_get","tags":["ai"]};
  };
  "/api/v1/ai/reviews/{review_id}/decision": {
    post: {"operationId":"decide_review_api_v1_ai_reviews__review_id__decision_post","tags":["ai"]};
  };
  "/api/v1/ai/runs": {
    get: {"operationId":"list_runs_api_v1_ai_runs_get","tags":["ai"]};
    post: {"operationId":"create_run_api_v1_ai_runs_post","tags":["ai"]};
  };
  "/api/v1/ai/runs/{run_id}/feedback": {
    get: {"operationId":"list_feedback_api_v1_ai_runs__run_id__feedback_get","tags":["ai"]};
    post: {"operationId":"create_feedback_api_v1_ai_runs__run_id__feedback_post","tags":["ai"]};
  };
  "/api/v1/ai/runs/{run_id}/reviews": {
    post: {"operationId":"create_review_api_v1_ai_runs__run_id__reviews_post","tags":["ai"]};
  };
  "/api/v1/ai/stream": {
    post: {"operationId":"stream_ai_run_api_v1_ai_stream_post","tags":["ai"]};
  };
  "/api/v1/auth/forgot-password": {
    post: {"operationId":"forgot_password_api_v1_auth_forgot_password_post","tags":["auth"]};
  };
  "/api/v1/auth/logout": {
    post: {"operationId":"logout_api_v1_auth_logout_post","tags":["auth"]};
  };
  "/api/v1/auth/me": {
    get: {"operationId":"me_api_v1_auth_me_get","tags":["auth"]};
  };
  "/api/v1/auth/mfa/disable": {
    post: {"operationId":"mfa_disable_api_v1_auth_mfa_disable_post","tags":["auth"]};
  };
  "/api/v1/auth/mfa/enable": {
    post: {"operationId":"mfa_enable_api_v1_auth_mfa_enable_post","tags":["auth"]};
  };
  "/api/v1/auth/mfa/verify": {
    post: {"operationId":"mfa_verify_api_v1_auth_mfa_verify_post","tags":["auth"]};
  };
  "/api/v1/auth/refresh": {
    post: {"operationId":"refresh_api_v1_auth_refresh_post","tags":["auth"]};
  };
  "/api/v1/auth/resend-verification": {
    post: {"operationId":"resend_verification_api_v1_auth_resend_verification_post","tags":["auth"]};
  };
  "/api/v1/auth/reset-password": {
    post: {"operationId":"reset_password_api_v1_auth_reset_password_post","tags":["auth"]};
  };
  "/api/v1/auth/sign-in": {
    post: {"operationId":"sign_in_api_v1_auth_sign_in_post","tags":["auth"]};
  };
  "/api/v1/auth/sign-up": {
    post: {"operationId":"sign_up_api_v1_auth_sign_up_post","tags":["auth"]};
  };
  "/api/v1/auth/verify-email": {
    post: {"operationId":"verify_email_api_v1_auth_verify_email_post","tags":["auth"]};
  };
  "/api/v1/calendar/items": {
    get: {"operationId":"list_calendar_items_api_v1_calendar_items_get","tags":["calendar"]};
    post: {"operationId":"create_calendar_item_api_v1_calendar_items_post","tags":["calendar"]};
  };
  "/api/v1/memory": {
    get: {"operationId":"list_memories_api_v1_memory_get","tags":["memory"]};
    post: {"operationId":"create_memory_api_v1_memory_post","tags":["memory"]};
  };
  "/api/v1/memory/{memory_id}": {
    delete: {"operationId":"delete_memory_api_v1_memory__memory_id__delete","tags":["memory"]};
    get: {"operationId":"get_memory_api_v1_memory__memory_id__get","tags":["memory"]};
  };
  "/api/v1/memory/{memory_id}/correct": {
    post: {"operationId":"correct_memory_api_v1_memory__memory_id__correct_post","tags":["memory"]};
  };
  "/api/v1/memory/audit": {
    get: {"operationId":"list_audit_logs_api_v1_memory_audit_get","tags":["memory"]};
  };
  "/api/v1/memory/export": {
    get: {"operationId":"export_memories_api_v1_memory_export_get","tags":["memory"]};
  };
  "/api/v1/memory/forget/{memory_id}": {
    post: {"operationId":"forget_memory_api_v1_memory_forget__memory_id__post","tags":["memory"]};
  };
  "/api/v1/memory/search": {
    post: {"operationId":"search_memories_api_v1_memory_search_post","tags":["memory"]};
  };
  "/api/v1/notifications": {
    get: {"operationId":"list_notifications_api_v1_notifications_get","tags":["notifications"]};
  };
  "/api/v1/notifications/{notification_id}/read": {
    patch: {"operationId":"mark_read_api_v1_notifications__notification_id__read_patch","tags":["notifications"]};
  };
  "/api/v1/notifications/preferences": {
    get: {"operationId":"get_preferences_api_v1_notifications_preferences_get","tags":["notifications"]};
    put: {"operationId":"update_preferences_api_v1_notifications_preferences_put","tags":["notifications"]};
  };
  "/api/v1/notifications/read-all": {
    patch: {"operationId":"mark_all_read_api_v1_notifications_read_all_patch","tags":["notifications"]};
  };
  "/api/v1/observability/links": {
    get: {"operationId":"get_observability_links_api_v1_observability_links_get","tags":["observability"]};
  };
  "/api/v1/observability/status": {
    get: {"operationId":"get_observability_status_api_v1_observability_status_get","tags":["observability"]};
  };
  "/api/v1/organizations": {
    get: {"operationId":"list_organizations_api_v1_organizations_get","tags":["organizations"]};
    post: {"operationId":"create_organization_api_v1_organizations_post","tags":["organizations"]};
  };
  "/api/v1/organizations/{organization_id}": {
    get: {"operationId":"get_organization_api_v1_organizations__organization_id__get","tags":["organizations"]};
  };
  "/api/v1/organizations/{organization_id}/members": {
    get: {"operationId":"list_members_api_v1_organizations__organization_id__members_get","tags":["organizations"]};
    post: {"operationId":"add_member_api_v1_organizations__organization_id__members_post","tags":["organizations"]};
  };
  "/api/v1/platform/admin/config": {
    get: {"operationId":"get_platform_config_api_v1_platform_admin_config_get","tags":["platform"]};
    put: {"operationId":"update_platform_config_api_v1_platform_admin_config_put","tags":["platform"]};
  };
  "/api/v1/platform/admin/email-templates": {
    get: {"operationId":"list_email_templates_api_v1_platform_admin_email_templates_get","tags":["platform"]};
    post: {"operationId":"create_email_template_api_v1_platform_admin_email_templates_post","tags":["platform"]};
  };
  "/api/v1/platform/admin/email-templates/{template_id}": {
    patch: {"operationId":"update_email_template_api_v1_platform_admin_email_templates__template_id__patch","tags":["platform"]};
  };
  "/api/v1/platform/admin/feature-flags": {
    get: {"operationId":"list_feature_flags_api_v1_platform_admin_feature_flags_get","tags":["platform"]};
    post: {"operationId":"create_feature_flag_api_v1_platform_admin_feature_flags_post","tags":["platform"]};
  };
  "/api/v1/platform/admin/feature-flags/{feature_flag_id}": {
    patch: {"operationId":"update_feature_flag_api_v1_platform_admin_feature_flags__feature_flag_id__patch","tags":["platform"]};
  };
  "/api/v1/platform/admin/plans": {
    get: {"operationId":"list_admin_plans_api_v1_platform_admin_plans_get","tags":["platform"]};
    post: {"operationId":"create_plan_api_v1_platform_admin_plans_post","tags":["platform"]};
  };
  "/api/v1/platform/admin/plans/{plan_id}": {
    patch: {"operationId":"update_plan_api_v1_platform_admin_plans__plan_id__patch","tags":["platform"]};
  };
  "/api/v1/platform/api-keys": {
    get: {"operationId":"list_api_keys_api_v1_platform_api_keys_get","tags":["platform"]};
    post: {"operationId":"create_api_key_api_v1_platform_api_keys_post","tags":["platform"]};
  };
  "/api/v1/platform/api-keys/{api_key_id}": {
    delete: {"operationId":"revoke_api_key_api_v1_platform_api_keys__api_key_id__delete","tags":["platform"]};
  };
  "/api/v1/platform/api-keys/{api_key_id}/rotate": {
    post: {"operationId":"rotate_api_key_api_v1_platform_api_keys__api_key_id__rotate_post","tags":["platform"]};
  };
  "/api/v1/platform/billing/plans": {
    get: {"operationId":"list_subscription_plans_api_v1_platform_billing_plans_get","tags":["platform"]};
  };
  "/api/v1/platform/billing/subscription": {
    get: {"operationId":"get_subscription_api_v1_platform_billing_subscription_get","tags":["platform"]};
    put: {"operationId":"select_subscription_plan_api_v1_platform_billing_subscription_put","tags":["platform"]};
  };
  "/api/v1/platform/entitlements/{entitlement_key}": {
    get: {"operationId":"get_entitlement_api_v1_platform_entitlements__entitlement_key__get","tags":["platform"]};
  };
  "/api/v1/platform/feature-flags": {
    get: {"operationId":"list_effective_feature_flags_api_v1_platform_feature_flags_get","tags":["platform"]};
  };
  "/api/v1/platform/metadata": {
    get: {"operationId":"get_platform_metadata_api_v1_platform_metadata_get","tags":["platform"]};
  };
  "/api/v1/platform/webhooks": {
    get: {"operationId":"list_webhooks_api_v1_platform_webhooks_get","tags":["platform"]};
    post: {"operationId":"create_webhook_api_v1_platform_webhooks_post","tags":["platform"]};
  };
  "/api/v1/platform/webhooks/{webhook_id}": {
    delete: {"operationId":"delete_webhook_api_v1_platform_webhooks__webhook_id__delete","tags":["platform"]};
    patch: {"operationId":"update_webhook_api_v1_platform_webhooks__webhook_id__patch","tags":["platform"]};
  };
  "/api/v1/platform/webhooks/{webhook_id}/test": {
    post: {"operationId":"test_webhook_api_v1_platform_webhooks__webhook_id__test_post","tags":["platform"]};
  };
  "/api/v1/profile": {
    get: {"operationId":"get_profile_api_v1_profile_get","tags":["profile"]};
    put: {"operationId":"update_profile_api_v1_profile_put","tags":["profile"]};
  };
  "/api/v1/profile/avatar": {
    delete: {"operationId":"delete_avatar_api_v1_profile_avatar_delete","tags":["profile"]};
    post: {"operationId":"upload_avatar_api_v1_profile_avatar_post","tags":["profile"]};
  };
  "/api/v1/projects": {
    get: {"operationId":"list_projects_api_v1_projects_get","tags":["projects"]};
    post: {"operationId":"create_project_api_v1_projects_post","tags":["projects"]};
  };
  "/api/v1/projects/{project_id}": {
    get: {"operationId":"get_project_api_v1_projects__project_id__get","tags":["projects"]};
  };
  "/api/v1/projects/{project_id}/members": {
    get: {"operationId":"list_project_members_api_v1_projects__project_id__members_get","tags":["projects"]};
  };
  "/api/v1/projects/{project_id}/members/{member_user_id}": {
    delete: {"operationId":"remove_project_member_api_v1_projects__project_id__members__member_user_id__delete","tags":["projects"]};
    put: {"operationId":"add_or_update_project_member_api_v1_projects__project_id__members__member_user_id__put","tags":["projects"]};
  };
  "/api/v1/projects/{project_id}/tasks": {
    get: {"operationId":"list_project_tasks_api_v1_projects__project_id__tasks_get","tags":["projects"]};
    post: {"operationId":"create_project_task_api_v1_projects__project_id__tasks_post","tags":["projects"]};
  };
  "/api/v1/projects/{project_id}/tasks/{task_id}": {
    delete: {"operationId":"delete_project_task_api_v1_projects__project_id__tasks__task_id__delete","tags":["projects"]};
    patch: {"operationId":"update_project_task_api_v1_projects__project_id__tasks__task_id__patch","tags":["projects"]};
  };
  "/api/v1/projects/{project_id}/tasks/reorder": {
    put: {"operationId":"reorder_project_tasks_api_v1_projects__project_id__tasks_reorder_put","tags":["projects"]};
  };
  "/api/v1/rag/ask": {
    post: {"operationId":"ask_rag_api_v1_rag_ask_post","tags":["rag"]};
  };
  "/api/v1/rag/documents": {
    get: {"operationId":"list_documents_api_v1_rag_documents_get","tags":["rag"]};
  };
  "/api/v1/rag/documents/{document_id}": {
    delete: {"operationId":"delete_document_api_v1_rag_documents__document_id__delete","tags":["rag"]};
    get: {"operationId":"get_document_api_v1_rag_documents__document_id__get","tags":["rag"]};
  };
  "/api/v1/rag/documents/{document_id}/chunks": {
    get: {"operationId":"list_document_chunks_api_v1_rag_documents__document_id__chunks_get","tags":["rag"]};
  };
  "/api/v1/rag/documents/{document_id}/index": {
    post: {"operationId":"index_document_api_v1_rag_documents__document_id__index_post","tags":["rag"]};
  };
  "/api/v1/rag/documents/upload": {
    post: {"operationId":"upload_document_api_v1_rag_documents_upload_post","tags":["rag"]};
  };
  "/api/v1/rag/jobs/{job_id}": {
    get: {"operationId":"get_job_api_v1_rag_jobs__job_id__get","tags":["rag"]};
  };
  "/api/v1/rag/queries": {
    get: {"operationId":"list_queries_api_v1_rag_queries_get","tags":["rag"]};
  };
  "/api/v1/rag/retrieve": {
    post: {"operationId":"retrieve_chunks_api_v1_rag_retrieve_post","tags":["rag"]};
  };
  "/api/v1/settings/config": {
    get: {"operationId":"get_config_settings_api_v1_settings_config_get","tags":["settings"]};
    put: {"operationId":"update_config_settings_api_v1_settings_config_put","tags":["settings"]};
  };
  "/api/v1/settings/database": {
    get: {"operationId":"list_database_settings_api_v1_settings_database_get","tags":["settings"]};
    post: {"operationId":"create_database_setting_api_v1_settings_database_post","tags":["settings"]};
  };
  "/api/v1/settings/database/{setting_id}": {
    delete: {"operationId":"delete_database_setting_api_v1_settings_database__setting_id__delete","tags":["settings"]};
    patch: {"operationId":"update_database_setting_api_v1_settings_database__setting_id__patch","tags":["settings"]};
  };
  "/api/v1/users/directory": {
    get: {"operationId":"list_directory_api_v1_users_directory_get","tags":["users"]};
  };
  "/api/v1/users/me": {
    get: {"operationId":"get_me_api_v1_users_me_get","tags":["users"]};
    patch: {"operationId":"update_me_api_v1_users_me_patch","tags":["users"]};
  };
  "/api/v1/users/me/password": {
    patch: {"operationId":"change_password_api_v1_users_me_password_patch","tags":["users"]};
  };
  "/api/v1/users/me/sessions": {
    get: {"operationId":"list_sessions_api_v1_users_me_sessions_get","tags":["users"]};
  };
  "/api/v1/users/me/sessions/{session_id}": {
    delete: {"operationId":"revoke_session_api_v1_users_me_sessions__session_id__delete","tags":["users"]};
  };
  "/health/live": {
    get: {"operationId":"live_health_live_get","tags":["health"]};
  };
  "/health/ready": {
    get: {"operationId":"ready_health_ready_get","tags":["health"]};
  };
  "/health/version": {
    get: {"operationId":"version_health_version_get","tags":["health"]};
  };
  "/health/workers": {
    get: {"operationId":"workers_health_workers_get","tags":["health"]};
  };
};

export type AdminUserListResponse = {
    "items": Array<AdminUserResponse>;
    "page": number;
    "page_size": number;
    "total": number;
  };

export type AdminUserResponse = {
    "created_at": string;
    "email": string;
    "full_name": string | null;
    "id": string;
    "is_active": boolean;
    "is_admin": boolean;
    "is_verified": boolean;
    "mfa_enabled": boolean;
    "roles": Array<string>;
  };

export type AdminUserStatusUpdate = {
    "is_active": boolean;
  };

export type AgentRunRequest = {
    "agent_id"?: string;
    "document_ids"?: Array<string>;
    "project_id"?: string | null;
    "prompt_template_key"?: string | null;
    "prompt_version_id"?: string | null;
    "retrieval_query"?: string | null;
    "review_required"?: boolean;
    "run_id"?: string | null;
    "top_k"?: number;
    "user_message"?: string | null;
    "variables"?: Record<string, unknown>;
  };

export type AgentRunResponse = {
    "agent_id"?: string | null;
    "agent_run_id"?: string | null;
    "completed_at": string | null;
    "created_at": string;
    "degradation_reason"?: string | null;
    "error_message": string | null;
    "estimated_cost_micros": number;
    "id": string;
    "injection_chunks_filtered"?: number;
    "input_messages": Array<Record<string, unknown>>;
    "input_tokens": number;
    "latency_ms": number | null;
    "memory_degraded"?: boolean;
    "memory_run_id": string;
    "model_name": string;
    "output_json": Record<string, unknown> | null;
    "output_text": string | null;
    "output_tokens": number;
    "prompt_template_id": string | null;
    "prompt_version_id": string | null;
    "provider_key": string;
    "response_format": string;
    "retrieval_degraded"?: boolean;
    "retrieval_query": string | null;
    "retrieved_chunk_ids": Array<string>;
    "review_status": string;
    "status": string;
    "total_tokens": number;
    "variables": Record<string, unknown>;
  };

export type AiAgentDefinitionCreate = {
    "configuration"?: Record<string, unknown>;
    "instructions"?: string;
    "key": string;
    "max_cost_micros"?: number | null;
    "max_steps"?: number;
    "max_tokens"?: number;
    "max_tool_calls"?: number;
    "model_name": string;
    "name": string;
    "provider_key"?: string;
    "timeout_seconds"?: number;
    "tool_ids"?: Array<string>;
  };

export type AiAgentDefinitionResponse = {
    "created_at": string;
    "id": string;
    "instructions": string;
    "is_active": boolean;
    "key": string;
    "max_cost_micros": number | null;
    "max_steps": number;
    "max_tokens": number;
    "max_tool_calls": number;
    "model_name": string;
    "name": string;
    "provider_key": string;
    "timeout_seconds": number;
    "tool_ids": Array<string>;
    "updated_at": string;
    "version": number;
  };

export type AiChunkMatchResponse = {
    "chunk_id": string;
    "chunk_index": number;
    "content": string;
    "document_id": string;
    "document_title": string;
    "score": number;
  };

export type AiDocumentCreate = {
    "content": string;
    "content_type"?: string;
    "description"?: string | null;
    "metadata"?: Record<string, unknown>;
    "title": string;
  };

export type AiDocumentResponse = {
    "chunk_count": number;
    "content_type": string;
    "created_at": string;
    "description": string | null;
    "filename": string | null;
    "id": string;
    "ingestion_status": string;
    "metadata": Record<string, unknown>;
    "size_bytes": number;
    "title": string;
    "updated_at": string;
  };

export type AiEvaluationCaseCreate = {
    "document_ids"?: Array<string>;
    "expected_chunk_ids"?: Array<string>;
    "expected_output_json"?: Record<string, unknown> | null;
    "expected_output_text"?: string | null;
    "input_variables"?: Record<string, unknown>;
    "notes"?: string | null;
    "retrieval_query"?: string | null;
  };

export type AiEvaluationCaseResponse = {
    "created_at": string;
    "dataset_id": string;
    "document_ids": Array<string>;
    "expected_chunk_ids": Array<string>;
    "expected_output_json": Record<string, unknown> | null;
    "expected_output_text": string | null;
    "id": string;
    "input_variables": Record<string, unknown>;
    "notes": string | null;
    "retrieval_query": string | null;
  };

export type AiEvaluationDatasetCreate = {
    "description"?: string | null;
    "name": string;
  };

export type AiEvaluationDatasetResponse = {
    "created_at": string;
    "description": string | null;
    "id": string;
    "name": string;
    "updated_at": string;
  };

export type AiEvaluationDatasetUpdate = {
    "description"?: string | null;
    "name"?: string | null;
  };

export type AiEvaluationRunItemResponse = {
    "ai_run_id": string;
    "evaluation_case_id": string;
    "notes": string | null;
    "passed": boolean;
    "score": number;
  };

export type AiEvaluationRunRequest = {
    "prompt_version_id": string;
  };

export type AiEvaluationRunResponse = {
    "average_score": number;
    "completed_at": string | null;
    "created_at": string;
    "dataset_id": string;
    "id": string;
    "items"?: Array<AiEvaluationRunItemResponse>;
    "passed_cases": number;
    "prompt_version_id": string;
    "status": string;
    "total_cases": number;
  };

export type AiFeedbackCreate = {
    "comment"?: string | null;
    "corrected_output"?: string | null;
    "rating": -1 | 1;
  };

export type AiFeedbackResponse = {
    "comment": string | null;
    "corrected_output": string | null;
    "created_at": string;
    "id": string;
    "rating": number;
    "run_id": string;
    "user_id": string;
  };

export type AiModuleOverviewResponse = {
    "datasets": Array<AiEvaluationDatasetResponse>;
    "documents": Array<AiDocumentResponse>;
    "prompt_templates": Array<AiPromptTemplateResponse>;
    "providers": Array<AiProviderDescriptor>;
    "recent_runs": Array<AiRunResponse>;
  };

export type AiPromptTemplateCreate = {
    "description"?: string | null;
    "key": string;
    "name": string;
  };

export type AiPromptTemplateResponse = {
    "active_version_id": string | null;
    "created_at": string;
    "description": string | null;
    "id": string;
    "is_active": boolean;
    "key": string;
    "name": string;
    "updated_at": string;
  };

export type AiPromptTemplateUpdate = {
    "active_version_id"?: string | null;
    "description"?: string | null;
    "is_active"?: boolean | null;
    "name"?: string | null;
  };

export type AiPromptVersionCreate = {
    "input_cost_per_million"?: number;
    "is_published"?: boolean;
    "model_name": string;
    "output_cost_per_million"?: number;
    "provider_key": string;
    "response_format"?: "text" | "json";
    "rollout_percentage"?: number;
    "system_prompt"?: string;
    "temperature"?: number;
    "user_prompt_template": string;
    "variable_definitions"?: Array<AiVariableDefinition>;
  };

export type AiPromptVersionResponse = {
    "created_at": string;
    "created_by_user_id": string | null;
    "id": string;
    "input_cost_per_million": number;
    "is_published": boolean;
    "model_name": string;
    "output_cost_per_million": number;
    "prompt_template_id": string;
    "provider_key": string;
    "response_format": string;
    "rollout_percentage": number;
    "system_prompt": string;
    "temperature": number;
    "user_prompt_template": string;
    "variable_definitions": Array<AiVariableDefinition>;
    "version_number": number;
  };

export type AiPromptVersionUpdate = {
    "input_cost_per_million"?: number | null;
    "is_published"?: boolean | null;
    "output_cost_per_million"?: number | null;
    "response_format"?: "text" | "json" | null;
    "rollout_percentage"?: number | null;
    "system_prompt"?: string | null;
    "temperature"?: number | null;
    "user_prompt_template"?: string | null;
    "variable_definitions"?: Array<AiVariableDefinition> | null;
  };

export type AiProviderDescriptor = {
    "available"?: boolean;
    "capabilities"?: Array<string>;
    "default_model"?: string | null;
    "key": string;
    "label": string;
    "supports_embeddings": boolean;
    "supports_generation": boolean;
  };

export type AiRetrieveRequest = {
    "document_ids"?: Array<string>;
    "query": string;
    "top_k"?: number;
  };

export type AiReviewCreate = {
    "assigned_to_user_id"?: string | null;
  };

export type AiReviewDecision = {
    "corrected_output"?: string | null;
    "reviewer_notes"?: string | null;
    "status": "approved" | "rejected" | "changes_requested";
  };

export type AiReviewItemResponse = {
    "assigned_to_user_id": string | null;
    "corrected_output": string | null;
    "created_at": string;
    "id": string;
    "requested_by_user_id": string;
    "reviewed_by_user_id": string | null;
    "reviewer_notes": string | null;
    "run_id": string;
    "status": string;
    "updated_at": string;
  };

export type AiRunRequest = {
    "document_ids"?: Array<string>;
    "prompt_template_key"?: string | null;
    "prompt_version_id"?: string | null;
    "retrieval_query"?: string | null;
    "review_required"?: boolean;
    "top_k"?: number;
    "variables"?: Record<string, unknown>;
  };

export type AiRunResponse = {
    "agent_id"?: string | null;
    "agent_run_id"?: string | null;
    "completed_at": string | null;
    "created_at": string;
    "degradation_reason"?: string | null;
    "error_message": string | null;
    "estimated_cost_micros": number;
    "id": string;
    "injection_chunks_filtered"?: number;
    "input_messages": Array<Record<string, unknown>>;
    "input_tokens": number;
    "latency_ms": number | null;
    "memory_degraded"?: boolean;
    "model_name": string;
    "output_json": Record<string, unknown> | null;
    "output_text": string | null;
    "output_tokens": number;
    "prompt_template_id": string | null;
    "prompt_version_id": string | null;
    "provider_key": string;
    "response_format": string;
    "retrieval_degraded"?: boolean;
    "retrieval_query": string | null;
    "retrieved_chunk_ids": Array<string>;
    "review_status": string;
    "status": string;
    "total_tokens": number;
    "variables": Record<string, unknown>;
  };

export type AiStreamRequest = {
    "max_output_tokens"?: number | null;
    "model"?: string | null;
    "provider_key"?: string | null;
    "response_format"?: "text" | "json";
    "system_prompt"?: string;
    "temperature"?: number;
    "tools"?: Array<AiToolDefinition>;
    "user_prompt": string;
  };

export type AiToolDefinition = {
    "description"?: string;
    "name": string;
    "parameters"?: Record<string, unknown>;
  };

export type AiVariableDefinition = {
    "description"?: string | null;
    "name": string;
    "required"?: boolean;
  };

export type AiWorkflowRunCreate = {
    "definition_id": string;
    "idempotency_key": string;
    "user_message": string;
  };

export type AiWorkflowRunResponse = {
    "agent_definition_id": string;
    "cancellation_requested": boolean;
    "checkpoint": Record<string, unknown>;
    "completed_at": string | null;
    "created_at": string;
    "current_step": number;
    "estimated_cost_micros": number;
    "id": string;
    "input_tokens": number;
    "last_error": string | null;
    "output_tokens": number;
    "state": Record<string, unknown>;
    "status": string;
    "tenant_id": string;
    "updated_at": string;
    "user_id": string;
  };

export type ApiKeyCreateRequest = {
    "expires_at"?: string | null;
    "name": string;
    "rate_limit_per_minute"?: number;
    "scopes"?: Array<string>;
  };

export type ApiKeyCreateResponse = {
    "created_at": string;
    "expires_at": string | null;
    "id": string;
    "key_prefix": string;
    "last_used_at": string | null;
    "name": string;
    "plaintext_key": string;
    "rate_limit_per_minute": number;
    "revoked_at": string | null;
    "scopes": Array<string>;
  };

export type ApiKeyResponse = {
    "created_at": string;
    "expires_at": string | null;
    "id": string;
    "key_prefix": string;
    "last_used_at": string | null;
    "name": string;
    "rate_limit_per_minute": number;
    "revoked_at": string | null;
    "scopes": Array<string>;
  };

export type ApiKeyRotateRequest = {
    "expires_at"?: string | null;
    "rate_limit_per_minute"?: number;
  };

export type AuditLogResponse = {
    "action": string;
    "created_at": string;
    "id": string;
    "ip_address": string | null;
    "resource_id": string | null;
    "resource_type": string | null;
    "user_id": string | null;
  };

export type AuthSessionResponse = {
    "user": AuthUserResponse;
  };

export type AuthUserResponse = {
    "email": string;
    "full_name": string | null;
    "id": string;
    "is_admin"?: boolean;
    "is_verified": boolean;
    "mfa_enabled"?: boolean;
  };

export type Body_upload_avatar_api_v1_profile_avatar_post = {
    "file": string;
  };

export type Body_upload_document_api_v1_ai_documents_upload_post = {
    "description"?: string | null;
    "file": string;
  };

export type Body_upload_document_api_v1_rag_documents_upload_post = {
    "file": string;
    "project_id"?: string | null;
  };

export type CalendarItemCreate = {
    "assignee_id"?: string | null;
    "date": string;
    "description"?: string | null;
    "end_time"?: string | null;
    "priority"?: "low" | "medium" | "high" | "urgent" | null;
    "project_id"?: string | null;
    "start_time"?: string | null;
    "title": string;
    "type": "event" | "appointment" | "task";
  };

export type CalendarItemResponse = {
    "created_at": string;
    "date": string;
    "description": string | null;
    "end_time"?: string | null;
    "id": string;
    "priority"?: "low" | "medium" | "high" | "urgent" | null;
    "project_id"?: string | null;
    "project_name"?: string | null;
    "source": "planner" | "task";
    "start_time"?: string | null;
    "status"?: "backlog" | "todo" | "in_progress" | "review" | "done" | null;
    "title": string;
    "type": "event" | "appointment" | "task";
  };

export type CapabilityManifestResponse = {
    "background_workers": Array<string>;
    "build_included": boolean;
    "configuration_requirements": Array<string>;
    "database_dependencies": Array<string>;
    "default_feature_flags": Array<string>;
    "dependencies": Array<string>;
    "deployment_enabled": boolean;
    "description": string;
    "health_checks": Array<string>;
    "identifier": string;
    "label": string;
    "optional_integrations": Array<string>;
    "required_permissions": Array<string>;
    "runtime_enabled": boolean;
    "user_visible": boolean;
  };

export type ConfigEntryResponse = {
    "description"?: string | null;
    "is_custom"?: boolean;
    "is_secret"?: boolean;
    "key": string;
    "requires_restart"?: boolean;
    "value": string;
    "value_type": string;
  };

export type ConfigEntryUpdate = {
    "key": string;
    "value"?: string;
  };

export type ConfigSettingsResponse = {
    "items": Array<ConfigEntryResponse>;
    "notice": string;
  };

export type ConfigSettingsUpdateRequest = {
    "items": Array<ConfigEntryUpdate>;
  };

export type DatabaseSettingCreate = {
    "description"?: string | null;
    "key": string;
    "value"?: string;
  };

export type DatabaseSettingResponse = {
    "description": string | null;
    "id": string;
    "key": string;
    "updated_at": string;
    "value": string;
  };

export type DatabaseSettingUpdate = {
    "description"?: string | null;
    "value"?: string | null;
  };

export type EffectiveFeatureFlagResponse = {
    "description": string | null;
    "effective_enabled": boolean;
    "id": string;
    "is_enabled": boolean;
    "key": string;
    "module_key": string | null;
    "name": string;
    "rollout_percentage": number;
    "updated_at": string;
  };

export type EmailTemplateCreate = {
    "html_template": string;
    "is_active"?: boolean;
    "key": string;
    "name": string;
    "subject_template": string;
    "text_template"?: string | null;
  };

export type EmailTemplateResponse = {
    "html_template": string;
    "id": string;
    "is_active": boolean;
    "key": string;
    "name": string;
    "subject_template": string;
    "text_template": string | null;
    "updated_at": string;
  };

export type EmailTemplateUpdate = {
    "html_template"?: string | null;
    "is_active"?: boolean | null;
    "name"?: string | null;
    "subject_template"?: string | null;
    "text_template"?: string | null;
  };

export type EntitlementResponse = {
    "enabled": boolean;
    "key": string;
  };

export type FeatureFlagCreate = {
    "description"?: string | null;
    "is_enabled"?: boolean;
    "key": string;
    "module_key"?: string | null;
    "name": string;
    "rollout_percentage"?: number;
  };

export type FeatureFlagResponse = {
    "description": string | null;
    "id": string;
    "is_enabled": boolean;
    "key": string;
    "module_key": string | null;
    "name": string;
    "rollout_percentage": number;
    "updated_at": string;
  };

export type FeatureFlagUpdate = {
    "description"?: string | null;
    "is_enabled"?: boolean | null;
    "module_key"?: string | null;
    "name"?: string | null;
    "rollout_percentage"?: number | null;
  };

export type ForgotPasswordRequest = {
    "email": string;
  };

export type GenericMessageResponse = {
    "detail": string;
  };

export type HTTPValidationError = {
    "detail"?: Array<ValidationError>;
  };

export type MemoryAuditLogResponse = {
    "agent_id": string | null;
    "created_at": string;
    "external_memory_id": string | null;
    "id": string;
    "memory_level": string | null;
    "memory_type": string | null;
    "operation": string;
    "project_id": string | null;
    "run_id": string | null;
    "source_ref": string | null;
    "user_id": string | null;
  };

export type MemoryCorrectionRequest = {
    "content": string;
    "reason": string;
  };

export type MemoryForgetRequest = {
    "reason": string;
  };

export type MemoryItemResponse = {
    "content": string;
    "created_at"?: string | null;
    "id": string;
    "metadata": MemoryMetadataResponse;
    "score"?: number | null;
    "updated_at"?: string | null;
  };

export type MemoryMetadataResponse = {
    "agent_id": string;
    "confidence"?: number;
    "consent_status"?: string | null;
    "created_at"?: string | null;
    "expires_at"?: string | null;
    "last_confirmed_at"?: string | null;
    "last_seen_at"?: string | null;
    "memory_level": string;
    "memory_type": string;
    "privacy"?: string;
    "project_id"?: string | null;
    "provenance"?: Record<string, unknown>;
    "run_id"?: string | null;
    "scope"?: string | null;
    "source": string;
    "source_ref"?: string | null;
    "user_id": string;
    "version"?: number;
  };

export type MemorySearchRequestBody = {
    "agent_id"?: string;
    "limit"?: number;
    "memory_levels"?: Array<string> | null;
    "project_id"?: string | null;
    "query": string;
    "run_id"?: string | null;
  };

export type MemoryWriteRequest = {
    "agent_id"?: string;
    "confidence"?: number;
    "consent_status"?: string;
    "content": string;
    "memory_level": string;
    "memory_type"?: string | null;
    "metadata"?: Record<string, unknown>;
    "privacy"?: string;
    "project_id"?: string | null;
    "retention_days"?: number | null;
    "run_id"?: string | null;
    "source"?: string;
    "source_ref"?: string | null;
  };

export type MemoryWriteResponse = {
    "accepted": boolean;
    "memory_id": string;
    "memory_level": string;
    "memory_type": string;
    "rejection_reason"?: string | null;
  };

export type MetricsResponse = {
    "active_users": number;
    "total_notifications": number;
    "total_users": number;
    "verified_users": number;
  };

export type MfaDisableRequest = {
    "code": string;
  };

export type MfaEnableResponse = {
    "provisioning_uri": string;
    "secret": string;
  };

export type MfaVerifyRequest = {
    "code": string;
  };

export type ModuleCatalogItem = {
    "description": string;
    "enabled": boolean;
    "key": string;
    "label": string;
    "user_visible": boolean;
  };

export type ModulePackResponse = {
    "description": string;
    "key": string;
    "label": string;
    "modules": Array<string>;
  };

export type NotificationPreferenceResponse = {
    "email_enabled": boolean;
    "locale": string;
    "marketing_enabled": boolean;
    "push_enabled": boolean;
  };

export type NotificationPreferenceUpdate = {
    "email_enabled"?: boolean | null;
    "locale"?: string | null;
    "marketing_enabled"?: boolean | null;
    "push_enabled"?: boolean | null;
  };

export type NotificationResponse = {
    "body": string | null;
    "created_at": string;
    "id": string;
    "is_read": boolean;
    "title": string;
    "type": string;
  };

export type ObservabilityDashboards = {
    "api": ObservabilityToolLink;
    "application_overview": ObservabilityToolLink;
    "cache": ObservabilityToolLink;
    "database": ObservabilityToolLink;
    "errors": ObservabilityToolLink;
    "frontend": ObservabilityToolLink;
    "scheduled_tasks": ObservabilityToolLink;
    "workers": ObservabilityToolLink;
  };

export type ObservabilityLinks = {
    "dashboards": ObservabilityDashboards;
    "grafana_base_url": ObservabilityToolLink;
    "prometheus_url": ObservabilityToolLink;
    "tempo_explore_url": ObservabilityToolLink;
  };

export type ObservabilityStatus = {
    "api": ObservabilityStatusItem;
    "background_jobs": ObservabilityStatusItem;
    "cache": ObservabilityStatusItem;
    "database": ObservabilityStatusItem;
    "error_rate": ObservabilityStatusItem;
    "frontend": ObservabilityStatusItem;
    "grafana": ObservabilityStatusItem;
    "prometheus": ObservabilityStatusItem;
    "request_latency": ObservabilityStatusItem;
    "tempo": ObservabilityStatusItem;
    "workers": ObservabilityStatusItem;
  };

export type ObservabilityStatusItem = {
    "detail": string;
    "last_checked_at"?: string | null;
    "queue_depth"?: number | null;
    "status": "healthy" | "degraded" | "down" | "unknown" | "not_configured";
    "url"?: string | null;
    "value"?: string | null;
  };

export type ObservabilityToolLink = {
    "allowed": boolean;
    "configured": boolean;
    "url": string | null;
  };

export type OrganizationCreate = {
    "name": string;
    "slug": string;
  };

export type OrganizationMemberCreate = {
    "role"?: "admin" | "member";
    "user_id": string;
  };

export type OrganizationMemberResponse = {
    "email": string;
    "full_name": string | null;
    "role": "owner" | "admin" | "member";
    "user_id": string;
  };

export type OrganizationResponse = {
    "created_at": string;
    "id": string;
    "name": string;
    "owner_id": string;
    "slug": string;
  };

export type PaginatedResponse_AgentRunResponse_ = {
    "items": Array<AgentRunResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_AiDocumentResponse_ = {
    "items": Array<AiDocumentResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_AiEvaluationCaseResponse_ = {
    "items": Array<AiEvaluationCaseResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_AiEvaluationDatasetResponse_ = {
    "items": Array<AiEvaluationDatasetResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_AiEvaluationRunResponse_ = {
    "items": Array<AiEvaluationRunResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_AiFeedbackResponse_ = {
    "items": Array<AiFeedbackResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_AiPromptTemplateResponse_ = {
    "items": Array<AiPromptTemplateResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_AiPromptVersionResponse_ = {
    "items": Array<AiPromptVersionResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_AiReviewItemResponse_ = {
    "items": Array<AiReviewItemResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_AiRunResponse_ = {
    "items": Array<AiRunResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_ApiKeyResponse_ = {
    "items": Array<ApiKeyResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_MemoryAuditLogResponse_ = {
    "items": Array<MemoryAuditLogResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_MemoryItemResponse_ = {
    "items": Array<MemoryItemResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_NotificationResponse_ = {
    "items": Array<NotificationResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_ProjectResponse_ = {
    "items": Array<ProjectResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_ProjectTaskResponse_ = {
    "items": Array<ProjectTaskResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_RagChunkResponse_ = {
    "items": Array<RagChunkResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_RagDocumentResponse_ = {
    "items": Array<RagDocumentResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_RagQueryResponse_ = {
    "items": Array<RagQueryResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_UserDirectoryResponse_ = {
    "items": Array<UserDirectoryResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PaginatedResponse_WebhookEndpointResponse_ = {
    "items": Array<WebhookEndpointResponse>;
    "limit": number;
    "offset": number;
    "total": number;
  };

export type PasswordChangeRequest = {
    "current_password": string;
    "new_password": string;
  };

export type PlatformConfigResponse = {
    "app_name": string;
    "available_features"?: Array<string>;
    "available_module_packs": Array<ModulePackResponse>;
    "capabilities"?: Array<CapabilityManifestResponse>;
    "core_domain_plural": string;
    "core_domain_singular": string;
    "enabled_modules": Array<string>;
    "mfa_enabled"?: boolean;
    "module_catalog": Array<ModuleCatalogItem>;
    "module_overrides": Record<string, boolean>;
    "module_pack": string;
  };

export type PlatformConfigUpdateRequest = {
    "app_name"?: string | null;
    "core_domain_plural"?: string | null;
    "core_domain_singular"?: string | null;
    "mfa_enabled"?: boolean | null;
    "module_overrides"?: Record<string, boolean> | null;
    "module_pack"?: string | null;
  };

export type PlatformMetadataResponse = {
    "app_name": string;
    "available_features"?: Array<string>;
    "available_module_packs": Array<ModulePackResponse>;
    "capabilities"?: Array<CapabilityManifestResponse>;
    "core_domain_plural": string;
    "core_domain_singular": string;
    "enabled_modules": Array<string>;
    "mfa_enabled"?: boolean;
    "module_catalog": Array<ModuleCatalogItem>;
    "module_pack": string;
  };

export type ProblemDetails = {
    "correlation_id"?: string;
    "detail": string;
    "errors"?: Array<Record<string, unknown>>;
    "instance"?: string;
    "status": number;
    "title": string;
    "type": string;
  };

export type ProfileResponse = {
    "avatar_url": string | null;
    "bio": string | null;
    "location": string | null;
    "user_id": string;
    "website": string | null;
  };

export type ProfileUpdate = {
    "bio"?: string | null;
    "location"?: string | null;
    "website"?: string | null;
  };

export type ProjectCreate = {
    "description"?: string | null;
    "name": string;
  };

export type ProjectMemberCreate = {
    "role": "editor" | "viewer";
    "user_id": string;
  };

export type ProjectMemberResponse = {
    "email": string;
    "full_name": string | null;
    "role": "owner" | "editor" | "viewer";
    "user_id": string;
  };

export type ProjectResponse = {
    "created_at": string;
    "description": string | null;
    "id": string;
    "name": string;
  };

export type ProjectTaskAssigneeResponse = {
    "email": string;
    "full_name": string | null;
    "id": string;
  };

export type ProjectTaskCreate = {
    "assignee_id"?: string | null;
    "description"?: string | null;
    "due_date"?: string | null;
    "priority"?: "low" | "medium" | "high" | "urgent";
    "status"?: "backlog" | "todo" | "in_progress" | "review" | "done";
    "title": string;
  };

export type ProjectTaskReorderColumn = {
    "status": "backlog" | "todo" | "in_progress" | "review" | "done";
    "task_ids": Array<string>;
  };

export type ProjectTaskReorderRequest = {
    "columns": Array<ProjectTaskReorderColumn>;
  };

export type ProjectTaskResponse = {
    "assignee"?: ProjectTaskAssigneeResponse | null;
    "created_at": string;
    "description": string | null;
    "due_date": string | null;
    "id": string;
    "position": number;
    "priority": "low" | "medium" | "high" | "urgent";
    "project_id": string;
    "status": "backlog" | "todo" | "in_progress" | "review" | "done";
    "title": string;
    "updated_at": string;
  };

export type ProjectTaskUpdate = {
    "assignee_id"?: string | null;
    "description"?: string | null;
    "due_date"?: string | null;
    "priority"?: "low" | "medium" | "high" | "urgent" | null;
    "status"?: "backlog" | "todo" | "in_progress" | "review" | "done" | null;
    "title"?: string | null;
  };

export type RagAskRequest = {
    "agent_id"?: string | null;
    "document_ids"?: Array<string> | null;
    "intent"?: string | null;
    "project_id"?: string | null;
    "query": string;
    "run_id"?: string | null;
  };

export type RagAskResponse = {
    "ai_run_id"?: string | null;
    "answer": string;
    "citation_validation_failed"?: boolean;
    "citations": Array<RagCitationResponse>;
    "coverage"?: RagCoverageResponse | null;
    "degradation_reason"?: string | null;
    "evidence_revision_hash"?: string | null;
    "index_revision_ids"?: Array<string>;
    "injection_chunks_filtered"?: number;
    "latency_ms": number;
    "memory_degraded"?: boolean;
    "model_name": string;
    "no_context_found": boolean;
    "query": string;
    "retrieval_degraded"?: boolean;
    "retrieval_trace_id"?: string | null;
    "retrieved_chunk_ids": Array<string>;
  };

export type RagChunkResponse = {
    "chunk_index": number;
    "content": string;
    "document_id": string;
    "id": string;
    "metadata"?: Record<string, unknown>;
    "revision_id"?: string | null;
    "token_count": number;
  };

export type RagCitationResponse = {
    "char_end"?: number | null;
    "char_start"?: number | null;
    "chunk_id": string;
    "chunk_index"?: number | null;
    "citation_number"?: number | null;
    "document_id": string;
    "filename": string;
    "offset_coordinate_system"?: string | null;
    "offset_scope"?: string | null;
    "offset_scope_id"?: string | null;
    "page_number"?: number | null;
    "parent_context_id"?: string | null;
    "score": number;
    "section_heading"?: string | null;
    "snippet": string;
    "source_span_ids"?: Array<string> | null;
    "source_spans"?: Array<Record<string, unknown>> | null;
    "used_in_answer"?: boolean;
  };

export type RagCoverageResponse = {
    "coverage_ratio"?: number;
    "documents_in_scope"?: number;
    "documents_with_retrieved_evidence"?: number;
    "retrieved_passage_count"?: number;
  };

export type RagDocumentResponse = {
    "content_type": string;
    "created_at": string;
    "current_revision_id"?: string | null;
    "filename": string;
    "id": string;
    "metadata"?: Record<string, unknown>;
    "organization_id": string | null;
    "original_filename": string;
    "project_id": string | null;
    "source_type": string;
    "status": string;
    "storage_path": string | null;
    "updated_at": string;
    "user_id": string;
  };

export type RagDocumentUploadResponse = {
    "document": RagDocumentResponse;
    "ingestion_job": RagIngestionJobResponse;
  };

export type RagIngestionJobResponse = {
    "created_at": string;
    "document_id": string;
    "error_code"?: string | null;
    "error_message": string | null;
    "finished_at": string | null;
    "id": string;
    "idempotency_key"?: string | null;
    "last_heartbeat_at"?: string | null;
    "malware_scan_status"?: string;
    "max_retries"?: number;
    "parser_version"?: string | null;
    "progress_percent"?: number;
    "project_id": string | null;
    "retry_count"?: number;
    "started_at": string | null;
    "status": string;
    "user_id": string;
  };

export type RagQueryResponse = {
    "answer": string;
    "created_at": string;
    "id": string;
    "latency_ms": number;
    "model_name": string;
    "project_id": string | null;
    "query": string;
  };

export type RagRetrievedChunkResponse = {
    "char_end"?: number | null;
    "char_start"?: number | null;
    "chunk_id": string;
    "chunk_index": number;
    "content": string;
    "document_id": string;
    "filename": string;
    "index_revision_id"?: string | null;
    "offset_coordinate_system"?: string | null;
    "offset_scope"?: string | null;
    "offset_scope_id"?: string | null;
    "page_number"?: number | null;
    "rank"?: number | null;
    "score": number;
    "source_span_ids"?: Array<string> | null;
    "source_spans"?: Array<Record<string, unknown>> | null;
    "used_in_answer"?: boolean;
  };

export type RagRetrieveRequest = {
    "document_ids"?: Array<string> | null;
    "intent"?: string | null;
    "project_id"?: string | null;
    "query": string;
    "top_k"?: number | null;
  };

export type RagRetrieveResponse = {
    "chunks": Array<RagRetrievedChunkResponse>;
    "coverage"?: RagCoverageResponse | null;
    "degradation_reason"?: string | null;
    "degraded"?: boolean;
    "fusion_method"?: string | null;
    "index_revision_ids"?: Array<string>;
    "injection_chunks_filtered"?: number;
    "intent"?: string | null;
    "no_matches"?: boolean;
    "retrieval_trace_id"?: string | null;
  };

export type ResendVerificationRequest = {
    "email": string;
  };

export type ResetPasswordRequest = {
    "new_password": string;
    "token": string;
  };

export type SessionResponse = {
    "created_at": string;
    "expires_at": string;
    "id": string;
  };

export type SignInRequest = {
    "email": string;
    "mfa_code"?: string | null;
    "password": string;
  };

export type SignUpRequest = {
    "admin_invite_code"?: string | null;
    "email": string;
    "full_name"?: string | null;
    "password": string;
  };

export type SubscriptionPlanCreate = {
    "code": string;
    "description"?: string | null;
    "features"?: Array<string>;
    "interval": string;
    "is_default"?: boolean;
    "name": string;
    "price_cents": number;
  };

export type SubscriptionPlanResponse = {
    "code": string;
    "created_at": string;
    "description": string | null;
    "features": Array<string>;
    "id": string;
    "interval": string;
    "is_active": boolean;
    "is_default": boolean;
    "name": string;
    "price_cents": number;
    "updated_at": string;
  };

export type SubscriptionPlanUpdate = {
    "description"?: string | null;
    "features"?: Array<string> | null;
    "interval"?: string | null;
    "is_active"?: boolean | null;
    "is_default"?: boolean | null;
    "name"?: string | null;
    "price_cents"?: number | null;
  };

export type SubscriptionSelectionRequest = {
    "plan_code": string;
  };

export type UserDirectoryResponse = {
    "email": string;
    "full_name": string | null;
    "id": string;
  };

export type UserProfileResponse = {
    "email": string;
    "full_name": string | null;
    "id": string;
    "is_verified": boolean;
    "mfa_enabled": boolean;
  };

export type UserProfileUpdate = {
    "full_name"?: string | null;
  };

export type UserSubscriptionResponse = {
    "cancel_at_period_end": boolean;
    "created_at": string;
    "current_period_end": string | null;
    "id": string;
    "plan": SubscriptionPlanResponse;
    "started_at": string;
    "status": string;
    "updated_at": string;
  };

export type ValidationError = {
    "ctx"?: Record<string, unknown>;
    "input"?: unknown;
    "loc": Array<string | number>;
    "msg": string;
    "type": string;
  };

export type VerifyEmailRequest = {
    "token": string;
  };

export type WebhookEndpointCreate = {
    "description"?: string | null;
    "events"?: Array<string>;
    "target_url": string;
  };

export type WebhookEndpointCreateResponse = {
    "created_at": string;
    "description": string | null;
    "events": Array<string>;
    "id": string;
    "is_active": boolean;
    "last_response_status": number | null;
    "last_tested_at": string | null;
    "signing_secret": string;
    "target_url": string;
    "updated_at": string;
  };

export type WebhookEndpointResponse = {
    "created_at": string;
    "description": string | null;
    "events": Array<string>;
    "id": string;
    "is_active": boolean;
    "last_response_status": number | null;
    "last_tested_at": string | null;
    "target_url": string;
    "updated_at": string;
  };

export type WebhookEndpointUpdate = {
    "description"?: string | null;
    "events"?: Array<string> | null;
    "is_active"?: boolean | null;
    "target_url"?: string | null;
  };

export type WebhookTestResponse = {
    "delivered": boolean;
    "error"?: string | null;
    "response_preview"?: string | null;
    "status_code"?: number | null;
  };
