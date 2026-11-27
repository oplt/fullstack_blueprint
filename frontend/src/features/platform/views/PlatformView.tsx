import { Zap as BillingIcon, Flag as FlagIcon, KeyRound as KeyIcon, Webhook as WebhookIcon } from "lucide-react";
import { SettingsTabs } from "../../../components/layout/SettingsTabs";
import { PageShell } from "../../../components/ui/PageShell";
import { QueryErrorAlert } from "../../../components/ui/QueryBoundary";
import { StatCard } from "../../../components/ui/StatCard";
import { ApiKeysSection, BillingSection, FlagsSection, WebhooksSection } from "../components/PlatformSections";
import { usePlatformView } from "../hooks/usePlatformView";

export default function PlatformPage() { const m = usePlatformView(); const metadata = m.metadataQuery.data;
    if (m.metadataQuery.isLoading) return (
        <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}><div

                className="animate-pulse rounded-md bg-muted rounded-lg" /></div>
    );
    if (!metadata) return <PageShell width="wide"><SettingsTabs /><QueryErrorAlert error={m.metadataQuery.error ?? new Error("Failed to load platform metadata.")} fallback="Failed to load platform metadata." onRetry={() => void m.metadataQuery.refetch()} /></PageShell>;
    const visible = metadata.module_catalog.filter((item) => item.user_visible && item.enabled);
    return <PageShell width="wide"><SettingsTabs /><div className="gap-4" style={{ display: "grid", gridTemplateColumns: "1fr" }}><StatCard label="Current plan" value={m.subscriptionQuery.data?.plan.name ?? "No plan"} description="Subscription tier currently selected" icon={<BillingIcon />} loading={m.enabled.billing && m.subscriptionQuery.isLoading} /><StatCard label="API keys" value={m.apiKeysQuery.data?.length ?? 0} description="Developer credentials available" icon={<KeyIcon />} color="secondary" /><StatCard label="Webhooks" value={m.webhooksQuery.data?.length ?? 0} description="Outbound delivery endpoints configured" icon={<WebhookIcon />} color="warning" /><StatCard label="Feature flags" value={m.flagsQuery.data?.filter((f) => f.effective_enabled).length ?? 0} description="Flags currently enabled for your account" icon={<FlagIcon />} color="success" /></div>{visible.length === 0 && <div role="alert" className="rounded-lg border border-border p-3 text-sm">The active module pack does not expose any end-user platform modules right now.</div>}{m.enabled.billing && <BillingSection m={m} />}{m.enabled.apiKeys && <ApiKeysSection m={m} />}{m.enabled.webhooks && <WebhooksSection m={m} />}{m.enabled.flags && <FlagsSection m={m} />}</PageShell>;
}
