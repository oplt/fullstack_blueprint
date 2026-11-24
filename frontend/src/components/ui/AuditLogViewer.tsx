import { ActivityTimeline } from "./ActivityTimeline";
import { AdvancedDataTable } from "./AdvancedDataTable";
import type { ColumnDef } from "@tanstack/react-table";

export function AuditLogViewer<T>({ rows, columns, timeline = false }: { rows: T[]; columns: ColumnDef<T, unknown>[]; timeline?: boolean }) {
    if (timeline) return <ActivityTimeline items={rows.map((row, index) => ({ id: String(index), title: String((row as Record<string, unknown>).operation ?? (row as Record<string, unknown>).action ?? "Activity"), description: String((row as Record<string, unknown>).description ?? ""), timestamp: String((row as Record<string, unknown>).created_at ?? "") }))} />;
    return <AdvancedDataTable<T> data={rows} columns={columns} getRowId={(_row, index) => String(index)} ariaLabel="Audit log" csvFileName="audit-log" />;
}

