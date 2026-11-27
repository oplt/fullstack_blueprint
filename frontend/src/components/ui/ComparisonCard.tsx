import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { TrendIndicator } from "./TrendIndicator";
export function ComparisonCard({ title, value, comparison, description, icon }: { title: string; value: ReactNode; comparison?: number; description?: string; icon?: ReactNode }) {
    return <Card><CardHeader className="ui-comparison-header"><div><p className="ui-muted-copy">{title}</p><CardTitle className="ui-comparison-value">{value}</CardTitle></div>{icon}</CardHeader><CardContent>{comparison == null ? null : <TrendIndicator value={comparison} label="vs previous" />}{description ? <p className="ui-comparison-description">{description}</p> : null}</CardContent></Card>;
}
