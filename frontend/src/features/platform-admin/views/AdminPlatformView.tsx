import { useQuery } from "@tanstack/react-query";
import { getPlatformConfig, listAdminEmailTemplates, listAdminFeatureFlags, listAdminPlans } from "../../../api/platform";
import { queryKeys } from "../../../config/queryKeys";
import { SettingsTabs } from "../../../components/layout/SettingsTabs";
import { PageShell } from "../../../components/ui/PageShell";
import { QueryErrorAlert } from "../../../components/ui/QueryBoundary";
import { AdminPlatformContent } from "../components/AdminPlatformContent";
import { platformAdminKey } from "../platformAdminModel";

export default function AdminPlatformPage() {
    const config = useQuery({ queryKey: queryKeys.platform.admin.config, queryFn: ({ signal }) => getPlatformConfig({ signal }) });
    const plans = useQuery({ queryKey: queryKeys.platform.admin.plans, queryFn: ({ signal }) => listAdminPlans({ signal }) });
    const flags = useQuery({ queryKey: queryKeys.platform.admin.featureFlags, queryFn: ({ signal }) => listAdminFeatureFlags({ signal }) });
    const templates = useQuery({ queryKey: queryKeys.platform.admin.emailTemplates, queryFn: ({ signal }) => listAdminEmailTemplates({ signal }) });
    if ([config, plans, flags, templates].some((query) => query.isLoading)) return (
        <PageShell width="wide"><div className="flex gap-[16px]"><div
                style={{ borderRadius: 24 }}
                className="animate-pulse rounded-md bg-muted" /><div
                style={{ borderRadius: 24 }}
                className="animate-pulse rounded-md bg-muted" /><div
                style={{ borderRadius: 24 }}
                className="animate-pulse rounded-md bg-muted" /></div></PageShell>
    );
    if (!config.data || !plans.data || !flags.data || !templates.data) return (
        <PageShell width="wide"><SettingsTabs /><div className="flex gap-[16px]" style={{ marginTop: 16 }}>
            {!config.data && <QueryErrorAlert error={config.error ?? new Error("Failed to load platform configuration.")} fallback="Failed to load platform configuration." title="Configuration" onRetry={() => void config.refetch()} />}
            {!plans.data && <QueryErrorAlert error={plans.error ?? new Error("Failed to load subscription plans.")} fallback="Failed to load subscription plans." title="Plans" onRetry={() => void plans.refetch()} />}
            {!flags.data && <QueryErrorAlert error={flags.error ?? new Error("Failed to load feature flags.")} fallback="Failed to load feature flags." title="Feature flags" onRetry={() => void flags.refetch()} />}
            {!templates.data && <QueryErrorAlert error={templates.error ?? new Error("Failed to load email templates.")} fallback="Failed to load email templates." title="Email templates" onRetry={() => void templates.refetch()} />}
        </div></PageShell>
    );
    return <AdminPlatformContent key={platformAdminKey(config.data, plans.data, flags.data, templates.data)} config={config.data} plans={plans.data} flags={flags.data} templates={templates.data} />;
}
