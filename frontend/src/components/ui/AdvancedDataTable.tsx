import {
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type ExpandedState,
    type OnChangeFn,
    type PaginationState,
    type RowSelectionState,
    type SortingState,
    type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Download, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

import { Button } from "./button";
import { EmptyState } from "./EmptyState";
import { Input } from "./input";

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
    csvFileName?: string;
    onExport?: (rows: T[]) => void;
    toolbarStart?: ReactNode;
    toolbarEnd?: ReactNode;
};

function resolveUpdater<T>(updater: T | ((previous: T) => T), previous: T): T {
    return typeof updater === "function"
        ? (updater as (previous: T) => T)(previous)
        : updater;
}

function csvValue(value: unknown): string {
    const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
    return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv<T>(table: ReturnType<typeof useReactTable<T>>, fileName: string) {
    const headers = table.getVisibleLeafColumns().map((column) => csvValue(column.id));
    const rows = table.getRowModel().rows.map((row) =>
        table.getVisibleLeafColumns().map((column) => csvValue(row.getValue(column.id))).join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function AdvancedDataTable<T>({
    columns,
    data,
    getRowId,
    ariaLabel,
    loading = false,
    error,
    emptyTitle = "No rows",
    emptyDescription = "Nothing to show yet.",
    emptyAction,
    globalFilter: globalFilterProp,
    onGlobalFilterChange,
    searchable = true,
    searchPlaceholder = "Search rows…",
    enableRowSelection = false,
    selectedRowIds,
    onSelectedRowIdsChange,
    enableColumnVisibility = true,
    enableColumnResizing = true,
    enableSorting = true,
    enableExpanding = false,
    renderSubComponent,
    manualPagination = false,
    manualFiltering = false,
    pageCount,
    pagination: paginationProp,
    onPaginationChange,
    pageSizeOptions = [10, 25, 50],
    csvFileName,
    onExport,
    toolbarStart,
    toolbarEnd,
}: AdvancedDataTableProps<T>) {
    const [internalFilter, setInternalFilter] = useState("");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [internalPagination, setInternalPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: pageSizeOptions[0] ?? 25 });
    const globalFilter = globalFilterProp ?? internalFilter;
    const pagination = paginationProp ?? internalPagination;
    const tableColumns = useMemo(() => columns, [columns]);
    // TanStack Table returns an intentionally mutable instance; React Compiler
    // must not memoize this hook result.
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns: tableColumns,
        getRowId,
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
        enableSorting,
        enableRowSelection,
        enableColumnResizing,
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

    return (
        <section className="space-y-3" aria-label={ariaLabel}>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {searchable ? <label className="relative min-w-52 flex-1 sm:max-w-sm">
                        <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
                        <Input value={globalFilter} onChange={(event) => table.setGlobalFilter(event.target.value)} placeholder={searchPlaceholder} aria-label={`${ariaLabel} search`} className="pl-8" />
                    </label> : null}
                    {toolbarStart}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {toolbarEnd}
                    {enableColumnVisibility ? <Popover><PopoverTrigger className="flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted" aria-label="Column visibility"><SlidersHorizontal className="size-4" /></PopoverTrigger><PopoverContent align="end" className="w-52 p-2">{table.getAllLeafColumns().map((column) => <label key={column.id} className="flex items-center gap-2 p-1 text-sm"><input type="checkbox" checked={column.getIsVisible()} disabled={!column.getCanHide()} onChange={column.getToggleVisibilityHandler()} />{column.id}</label>)}</PopoverContent></Popover> : null}
                    {csvFileName || onExport ? <Button variant="outline" onClick={exportRows} type="button"><Download className="mr-2 size-4" />Export CSV</Button> : null}
                </div>
            </div>
            {error ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
            {loading ? <div className="space-y-2" aria-busy="true"><div className="animate-pulse rounded-md bg-muted h-10 w-full rounded-lg" /><div className="animate-pulse rounded-md bg-muted h-52 w-full rounded-lg" /></div> : !hasRows ? <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} icon={<span aria-hidden="true">∅</span>} /> : <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-sm" aria-label={ariaLabel} aria-busy={loading}>
                    <thead className="bg-muted/60"><tr>
                        {enableExpanding ? <th scope="col" className="w-10 p-2" /> : null}
                        {enableRowSelection ? <th scope="col" className="w-10 p-2"><input type="checkbox" aria-label="Select all rows" checked={table.getIsAllRowsSelected()} ref={(element) => { if (element) element.indeterminate = table.getIsSomeRowsSelected(); }} onChange={table.getToggleAllRowsSelectedHandler()} /></th> : null}
                        {table.getHeaderGroups().map((group) => group.headers.map((header) => <th key={header.id} scope="col" className="relative whitespace-nowrap border-b border-border px-3 py-2 text-left font-semibold" style={{ width: header.getSize() }}>{header.isPlaceholder ? null : <div className={header.column.getCanSort() ? "cursor-pointer select-none" : undefined} onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === "asc" ? " ↑" : header.column.getIsSorted() === "desc" ? " ↓" : null}</div>}{enableColumnResizing && header.column.getCanResize() ? <span onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} className="absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-primary" aria-hidden="true" /> : null}</th>))}
                    </tr></thead>
                    <tbody>{table.getRowModel().rows.map((row) => <>
                        <tr key={row.id} className="border-b border-border hover:bg-muted/30" aria-selected={row.getIsSelected()}>
                            {enableExpanding ? <td className="p-2"><button type="button" aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"} onClick={row.getToggleExpandedHandler()}>{row.getIsExpanded() ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button></td> : null}
                            {enableRowSelection ? <td className="p-2"><input type="checkbox" aria-label={`Select row ${row.id}`} checked={row.getIsSelected()} disabled={!row.getCanSelect()} onChange={row.getToggleSelectedHandler()} /></td> : null}
                            {row.getVisibleCells().map((cell) => <td key={cell.id} className="px-3 py-2 align-top">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                        </tr>
                        {row.getIsExpanded() ? <tr key={`${row.id}-expanded`}><td colSpan={colSpan} className="bg-muted/20 p-3">{renderSubComponent?.(row.original)}</td></tr> : null}
                    </>)}</tbody>
                </table>
            </div>}
            <div className="flex flex-col justify-between gap-2 text-sm sm:flex-row sm:items-center">
                <span className="text-muted-foreground">{table.getFilteredRowModel().rows.length} result{table.getFilteredRowModel().rows.length === 1 ? "" : "s"}</span>
                <div className="flex items-center gap-2"><label className="flex items-center gap-1">Rows <select value={pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))} className="rounded border border-input bg-background px-1 py-1">{pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}</select></label><Button variant="outline" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} type="button">Previous</Button><span>Page {pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span><Button variant="outline" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} type="button">Next</Button></div>
            </div>
        </section>
    );
}
