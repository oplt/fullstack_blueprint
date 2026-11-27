import {
    flexRender, getCoreRowModel, getExpandedRowModel, getFilteredRowModel,
    getPaginationRowModel, getSortedRowModel, useReactTable,
    type ColumnDef, type ExpandedState, type OnChangeFn, type PaginationState,
    type RowSelectionState, type SortingState, type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Download, Search, SlidersHorizontal, Inbox } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { EmptyState } from "./EmptyState";
import { Input } from "./input";
import { Checkbox } from "./checkbox";
import { NativeSelect } from "./native-select";
import { Skeleton } from "./skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { cn } from "@/lib/utils";

export type AdvancedDataTableProps<T> = {
    columns: ColumnDef<T, unknown>[];
    data: T[];
    getRowId?: (row: T, index: number, parent?: { id: string }) => string;
    ariaLabel: string;
    loading?: boolean;
    error?: ReactNode;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyAction?: ReactNode;
    emptyIcon?: ReactNode;
    globalFilter?: string;
    onGlobalFilterChange?: (value: string) => void;
    searchable?: boolean;
    searchPlaceholder?: string;
    enableRowSelection?: boolean;
    selectedRowIds?: RowSelectionState;
    onSelectedRowIdsChange?: (selection: RowSelectionState) => void;
    enableColumnVisibility?: boolean;
    enableColumnResizing?: boolean;
    enableSorting?: boolean;
    enableExpanding?: boolean;
    renderSubComponent?: (row: T) => ReactNode;
    manualPagination?: boolean;
    manualFiltering?: boolean;
    pageCount?: number;
    pagination?: PaginationState;
    onPaginationChange?: (pagination: PaginationState) => void;
    pageSizeOptions?: number[];
    density?: "compact" | "comfortable";
    onDensityChange?: (density: "compact" | "comfortable") => void;
    showDensityToggle?: boolean;
    stickyHeader?: boolean;
    stickyFirstColumn?: boolean;
    selectedRowId?: string | null;
    onRowClick?: (row: T) => void;
    csvFileName?: string;
    onExport?: (rows: T[]) => void;
    toolbarStart?: ReactNode;
    toolbarEnd?: ReactNode;
};

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
    return typeof updater === "function" ? (updater as (previous: T) => T)(previous) : updater;
}
function csvValue(value: unknown): string {
    const raw = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
    const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${text.replaceAll('"', '""')}"`;
}
function downloadCsv<T>(table: ReturnType<typeof useReactTable<T>>, fileName: string) {
    const headers = table.getVisibleLeafColumns().map((column) => csvValue(column.id));
    const rows = table.getRowModel().rows.map((row) => table.getVisibleLeafColumns().map((column) => csvValue(row.getValue(column.id))).join(","));
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function AdvancedDataTable<T>({
    columns, data, getRowId, ariaLabel, loading = false, error,
    emptyTitle = "No rows", emptyDescription = "Nothing to show yet.", emptyAction, emptyIcon,
    globalFilter: globalFilterProp, onGlobalFilterChange, searchable = true, searchPlaceholder = "Search rows…",
    enableRowSelection = false, selectedRowIds, onSelectedRowIdsChange,
    enableColumnVisibility = true, enableColumnResizing = true, enableSorting = true,
    enableExpanding = false, renderSubComponent, manualPagination = false, manualFiltering = false,
    pageCount, pagination: paginationProp, onPaginationChange, pageSizeOptions = [10, 25, 50],
    density: densityProp, onDensityChange, showDensityToggle = false, stickyHeader = true,
    stickyFirstColumn = false, selectedRowId, onRowClick, csvFileName, onExport, toolbarStart, toolbarEnd,
}: AdvancedDataTableProps<T>) {
    const [internalFilter, setInternalFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [internalDensity, setInternalDensity] = useState<"compact" | "comfortable">("compact");
    const density = densityProp ?? internalDensity;
    const [internalPagination, setInternalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: pageSizeOptions[0] ?? 25 });
    const globalFilter = globalFilterProp ?? internalFilter;
    const pagination = paginationProp ?? internalPagination;
    // TanStack Table returns an intentionally mutable instance; React Compiler
    // must not memoize this hook result.
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data, columns, getRowId,
        state: { sorting, globalFilter, columnVisibility, rowSelection: selectedRowIds ?? rowSelection, expanded, pagination },
        onSortingChange: setSorting,
        onGlobalFilterChange: (updater) => {
            const next = resolveUpdater(updater, globalFilter);
            onGlobalFilterChange?.(next);
            if (globalFilterProp === undefined) setInternalFilter(next);
        },
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: ((updater) => {
            const next = resolveUpdater(updater, selectedRowIds ?? rowSelection);
            onSelectedRowIdsChange?.(next);
            if (selectedRowIds === undefined) setRowSelection(next);
        }) as OnChangeFn<RowSelectionState>,
        onExpandedChange: setExpanded,
        onPaginationChange: ((updater) => {
            const next = resolveUpdater(updater, pagination);
            onPaginationChange?.(next);
            if (paginationProp === undefined) setInternalPagination(next);
        }) as OnChangeFn<PaginationState>,
        enableSorting, enableRowSelection, enableColumnResizing,
        columnResizeMode: "onChange",
        getRowCanExpand: () => enableExpanding && Boolean(renderSubComponent),
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
        manualPagination,
        pageCount: manualPagination ? pageCount : undefined,
    });
    const exportRows = () => {
        if (onExport) return onExport(table.getRowModel().rows.map((row) => row.original));
        if (csvFileName) downloadCsv(table, csvFileName);
    };
    const hasRows = table.getRowModel().rows.length > 0;
    const colSpan = table.getVisibleLeafColumns().length + (enableRowSelection ? 1 : 0) + (enableExpanding ? 1 : 0);

    return <section className="ui-data-table" aria-label={ariaLabel}>
        <div className="ui-data-table-toolbar">
            <div className="ui-data-table-toolbar-start">
                {searchable ? <label className="ui-data-table-search">
                    <Search className="ui-data-table-search-icon" aria-hidden="true" />
                    <Input value={globalFilter} onChange={(event) => table.setGlobalFilter(event.target.value)} placeholder={searchPlaceholder} aria-label={`${ariaLabel} search`} className="ui-data-table-search-input" />
                </label> : null}
                {toolbarStart}
                {showDensityToggle ? <div className="ui-data-table-density" aria-label="Table density">
                    {(["compact", "comfortable"] as const).map((value) => <Button key={value} variant={density === value ? "secondary" : "ghost"} aria-pressed={density === value} onClick={() => { if (densityProp === undefined) setInternalDensity(value); onDensityChange?.(value); }} type="button">{value === "compact" ? "Compact" : "Comfortable"}</Button>)}
                </div> : null}
            </div>
            <div className="ui-data-table-toolbar-end">
                {toolbarEnd}
                {enableColumnVisibility ? <Popover><PopoverTrigger render={<Button variant="outline" size="icon" aria-label="Column visibility" />}><SlidersHorizontal /></PopoverTrigger><PopoverContent align="end" className="ui-data-table-column-popover">{table.getAllLeafColumns().map((column) => <label key={column.id} className="ui-data-table-column-label"><Checkbox checked={column.getIsVisible()} disabled={!column.getCanHide()} onCheckedChange={(checked) => column.toggleVisibility(checked)} />{column.id}</label>)}</PopoverContent></Popover> : null}
                {csvFileName || onExport ? <Button variant="outline" onClick={exportRows} type="button"><Download />Export CSV</Button> : null}
            </div>
        </div>
        {error ? <div role="alert" className="ui-data-table-error">{error}</div> : null}
        {loading ? <div className="ui-data-table-loading" aria-busy="true"><Skeleton className="ui-data-table-loading-header" /><Skeleton className="ui-data-table-loading-body" /></div> : !hasRows ? <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} icon={emptyIcon ?? <Inbox aria-hidden="true" />} /> : <div className="ui-readonly-table">
            <Table density={density} aria-label={ariaLabel} aria-busy={loading}>
                <TableHeader className={cn("ui-readonly-table-header", stickyHeader && "ui-data-table-sticky-header")}>
                    <TableRow>
                        {enableExpanding ? <TableHead scope="col" className="ui-data-table-control-head" /> : null}
                        {enableRowSelection ? <TableHead scope="col" className="ui-data-table-control-head"><Checkbox aria-label="Select all rows" checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onCheckedChange={(checked) => table.toggleAllRowsSelected(checked)} /></TableHead> : null}
                        {table.getHeaderGroups().map((group) => group.headers.map((header) => {
                            const sort = header.column.getIsSorted();
                            const label = flexRender(header.column.columnDef.header, header.getContext());
                            return <TableHead key={header.id} scope="col" className={cn("ui-data-table-head", stickyFirstColumn && header.column.getIndex() === 0 && "ui-data-table-sticky-head")} style={{ width: header.getSize() }} aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}>
                                {header.isPlaceholder ? null : <div className={header.column.getCanSort() ? "ui-data-table-sort" : undefined} onClick={header.column.getToggleSortingHandler()}>{label}{sort === "asc" ? <ArrowUp aria-hidden="true" /> : sort === "desc" ? <ArrowDown aria-hidden="true" /> : null}</div>}
                                {enableColumnResizing && header.column.getCanResize() ? <span onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} className="ui-data-table-resize" aria-hidden="true" /> : null}
                            </TableHead>;
                        }))}
                    </TableRow>
                </TableHeader>
                <TableBody>{table.getRowModel().rows.map((row) => <Fragment key={row.id}>
                    <TableRow key={row.id} onClick={(event) => { if (event.target instanceof Element && event.target.closest("button, a, input, select, textarea, label")) return; onRowClick?.(row.original); }} className="ui-data-table-row" data-selected={selectedRowId === row.id} aria-selected={selectedRowId === row.id || row.getIsSelected()}>
                        {enableExpanding ? <TableCell className="ui-data-table-control-cell"><Button variant="ghost" size="icon-sm" aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"} onClick={row.getToggleExpandedHandler()} type="button">{row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />}</Button></TableCell> : null}
                        {enableRowSelection ? <TableCell className="ui-data-table-control-cell"><Checkbox aria-label={`Select row ${row.id}`} checked={row.getIsSelected()} disabled={!row.getCanSelect()} onCheckedChange={(checked) => row.toggleSelected(checked)} /></TableCell> : null}
                        {row.getVisibleCells().map((cell) => <TableCell key={cell.id} className={stickyFirstColumn && cell.column.getIndex() === 0 ? "ui-data-table-sticky-cell" : "align-top"}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                    </TableRow>
                    {row.getIsExpanded() ? <TableRow key={`${row.id}-expanded`}><TableCell colSpan={colSpan} className="ui-data-table-expanded">{renderSubComponent?.(row.original)}</TableCell></TableRow> : null}
                </Fragment>)}</TableBody>
            </Table>
        </div>}
        <div className="ui-data-table-footer">
            <span className="text-muted-foreground">{table.getFilteredRowModel().rows.length} result{table.getFilteredRowModel().rows.length === 1 ? "" : "s"}</span>
            <div className="ui-data-table-pagination"><label className="ui-data-table-page-size">Rows <NativeSelect value={pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))} className="ui-data-table-page-select">{pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}</NativeSelect></label><Button variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} type="button">Previous</Button><span>Page {pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span><Button variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} type="button">Next</Button></div>
        </div>
    </section>;
}
