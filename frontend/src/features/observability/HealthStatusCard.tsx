import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthStatus } from "./types";
const STATUS_VARIANTS: Record<HealthStatus, "success" | "warning" | "destructive" | "outline" | "information"> = { healthy: "success", degraded: "warning", down: "destructive", unknown: "outline", not_configured: "information" };
type HealthStatusCardProps = { title: string; status: HealthStatus; detail: string; metric?: string | null; lastCheckedAt?: string | null; icon: ReactNode };
function formatCheckedAt(value?: string | null) {
    if (!value || !Number.isFinite(Date.parse(value))) return null;
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}
export function HealthStatusCard({ title, status, detail, metric, lastCheckedAt, icon }: HealthStatusCardProps) {
    const checkedAt = formatCheckedAt(lastCheckedAt);
    return <Card as="article" size="sm" className="ui-health-card">
        <CardHeader className="ui-health-header"><div className="min-w-0"><CardTitle as="h3">{title}</CardTitle><Badge className="mt-ui-xs" variant={STATUS_VARIANTS[status]}>{status.replaceAll("_", " ")}</Badge></div><div className="ui-health-icon" data-tone={status}>{icon}</div></CardHeader>
        <CardContent className="ui-health-content">{metric && <p className="ui-metric-value">{metric}</p>}<p className="flex-1 text-body-sm text-muted-foreground">{detail}</p>{checkedAt && <span className="ui-metric-label">Checked {checkedAt}</span>}</CardContent>
    </Card>;
}
