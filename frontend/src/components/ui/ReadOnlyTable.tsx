import type { ReactNode } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type ReadOnlyTableColumn = {
  key: string
  label: ReactNode
}

type ReadOnlyTableProps<Row> = {
  ariaLabel: string
  columns: readonly ReadOnlyTableColumn[]
  rows: readonly Row[]
  renderCell: (row: Row, column: ReadOnlyTableColumn) => ReactNode
}

export function ReadOnlyTable<Row>({
  ariaLabel,
  columns,
  rows,
  renderCell,
}: ReadOnlyTableProps<Row>) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table aria-label={ariaLabel}>
        <TableHeader className="bg-muted/60">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} scope="col">{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index} className="border-t border-border">
              {columns.map((column) => (
                <TableCell key={column.key}>{renderCell(row, column)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
