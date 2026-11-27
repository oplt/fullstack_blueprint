import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { SettingsTabs } from "../../../components/layout/SettingsTabs";
import { PageShell } from "../../../components/ui/PageShell";
import { InvestigationContextFields } from "../components/InvestigationContextFields";
import { ObservabilityHealthGrid } from "../components/ObservabilityHealthGrid";
import { ObservabilityShortcuts } from "../components/ObservabilityShortcuts";
import { useObservabilityView } from "../hooks/useObservabilityView";
import { buildGrafanaUrl, openExternalUrl } from "../urlBuilders";

export default function ObservabilityPage() {
    const model = useObservabilityView();
    const links = model.linksQuery.data;

    return (
        <PageShell width="wide">
            <SettingsTabs />
            <div className="flex flex-row justify-end mb-ui-md" >
                <Button
                    variant="default"
                    disabled={!model.technicalAccess || !links?.dashboards.application_overview.url}
                    onClick={() => {
                        const url = buildGrafanaUrl(links?.dashboards.application_overview.url, model.context);
                        if (url) openExternalUrl(url);
                    }}
                    type="button"
                ><ExternalLink />Open Grafana
                                    </Button>
            </div>
            {model.linksQuery.isError && (
                <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">
                    Observability links are unavailable. Health checks can still render when the status endpoint responds.
                </div>
            )}
            <InvestigationContextFields filters={model.filters} setters={model.setters} />
            <ObservabilityHealthGrid healthItems={model.healthItems} statusQuery={model.statusQuery} />
            <ObservabilityShortcuts context={model.context} isAdmin={model.isAdmin} linksQuery={model.linksQuery} />
        </PageShell>
    );
}
