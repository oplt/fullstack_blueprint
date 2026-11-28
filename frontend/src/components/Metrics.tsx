import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveCardGrid, type ResponsiveCardColumns } from "./Section";

type StatCardProps = { label: string; value: ReactNode; description?: ReactNode; icon: ReactNode; loading?: boolean; dense?: boolean; color?: "primary" | "secondary" | "success" | "warning" | "error" | "info" };

export function StatCard({ label, value, description, icon, loading = false, dense = false, color = "primary" }: StatCardProps) {
    return (
        <Card size={dense ? "sm" : "default"} className="ui-stat-card">
            <CardHeader className="ui-stat-card-header"><span className="ui-muted-copy">{label}</span><span data-tone={color} className="ui-stat-icon">{icon}</span></CardHeader>
            <CardContent>{loading ? <div className="ui-stat-loading"><Skeleton className="ui-stat-value-skeleton" /><Skeleton className="ui-stat-description-skeleton" /></div> : <div className="ui-stat-body"><div className="ui-stat-value">{value}</div>{description ? <p className="ui-muted-copy">{description}</p> : null}</div>}</CardContent>
        </Card>
    );
}

type MetricGridProps = { children: ReactNode; columns?: ResponsiveCardColumns };

export function MetricGrid({ children, columns = 4 }: MetricGridProps) {
    return <ResponsiveCardGrid columns={columns}>{children}</ResponsiveCardGrid>;
}

export function StatCardSkeletonGrid({ count = 4 }: { count?: number }) {
    const columns = count >= 4 ? 4 : count === 3 ? 3 : 2;
    return <MetricGrid columns={columns}>{Array.from({ length: count }).map((_, index) => <Skeleton key={index} className="ui-stat-card-skeleton" />)}</MetricGrid>;
}
