import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
export type ReadOnlyTableColumn = { key: string; label: ReactNode };
type ReadOnlyTableProps<Row> = { ariaLabel: string; columns: readonly ReadOnlyTableColumn[]; rows: readonly Row[]; renderCell: (row: Row, column: ReadOnlyTableColumn) => ReactNode };
export function ReadOnlyTable<Row>({ ariaLabel, columns, rows, renderCell }: ReadOnlyTableProps<Row>) {
    return <div className="ui-readonly-table"><Table aria-label={ariaLabel}><TableHeader className="ui-readonly-table-header"><TableRow>{columns.map((column) => <TableHead key={column.key} scope="col">{column.label}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row, index) => <TableRow key={index} className="ui-readonly-table-row">{columns.map((column) => <TableCell key={column.key}>{renderCell(row, column)}</TableCell>)}</TableRow>)}</TableBody></Table></div>;
}
