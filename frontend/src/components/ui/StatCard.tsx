import type { ReactNode } from "react";
import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";
type StatCardProps = { label: string; value: ReactNode; description?: ReactNode; icon: ReactNode; loading?: boolean; color?: "primary" | "secondary" | "success" | "warning" | "error" | "info" };
export function StatCard({ label, value, description, icon, loading = false, color = "primary" }: StatCardProps) {
    return <Card className="ui-stat-card">
        <CardHeader className="ui-stat-card-header"><span className="ui-muted-copy">{label}</span><span data-tone={color} className="ui-stat-icon">{icon}</span></CardHeader>
        <CardContent>{loading ? <div className="ui-stat-loading"><Skeleton className="ui-stat-value-skeleton" /><Skeleton className="ui-stat-description-skeleton" /></div> : <div className="ui-stat-body"><div className="ui-stat-value">{value}</div>{description ? <p className="ui-muted-copy">{description}</p> : null}</div>}</CardContent>
    </Card>;
}
