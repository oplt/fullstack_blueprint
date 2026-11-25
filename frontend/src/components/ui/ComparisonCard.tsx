import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

function TrendIndicator({ value, label, positiveIsGood = true }: { value: number; label?: string; positiveIsGood?: boolean }) {
    const positive = positiveIsGood ? value >= 0 : value <= 0;
    return <span className={positive ? "text-success" : "text-destructive"}>{value >= 0 ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%{label ? ` ${label}` : ""}</span>;
}

export function ComparisonCard({ title, value, comparison, description, icon }: { title: string; value: ReactNode; comparison?: number; description?: string; icon?: ReactNode }) {
    return <Card><CardHeader className="flex flex-row items-start justify-between gap-3"><div><p className="text-sm text-muted-foreground">{title}</p><CardTitle className="mt-2 text-2xl">{value}</CardTitle></div>{icon}</CardHeader><CardContent>{comparison == null ? null : <TrendIndicator value={comparison} label="vs previous" />}{description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}</CardContent></Card>;
}
