import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";

import { AdvancedDataTable } from "./AdvancedDataTable";

type Row = { id: string; name: string; score: number };
const rows: Row[] = [{ id: "1", name: "zebra", score: 1 }, { id: "2", name: "apple", score: 3 }];
const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: (info) => info.getValue() },
    { accessorKey: "score", header: "Score", cell: (info) => info.getValue() },
];

describe("AdvancedDataTable", () => {
    it("searches, sorts, selects, and paginates accessible rows", () => {
        render(<AdvancedDataTable<Row> data={rows} columns={columns} getRowId={(row) => row.id} ariaLabel="People" enableRowSelection pageSizeOptions={[1]} csvFileName="people" />);
        expect(screen.getByText("zebra")).toBeInTheDocument();
        fireEvent.change(screen.getByRole("textbox", { name: "People search" }), { target: { value: "apple" } });
        expect(screen.getByText("apple")).toBeInTheDocument();
        expect(screen.queryByText("zebra")).not.toBeInTheDocument();
        fireEvent.click(screen.getByText("Score"));
        fireEvent.click(screen.getByRole("checkbox", { name: "Select row 2" }));
        expect(screen.getByRole("checkbox", { name: "Select row 2" })).toBeChecked();
    });

    it("renders loading and error states", () => {
        const { rerender } = render(<AdvancedDataTable<Row> data={[]} columns={columns} ariaLabel="Rows" loading />);
        expect(screen.getByRole("region", { name: "Rows" })).toHaveAttribute("aria-label", "Rows");
        rerender(<AdvancedDataTable<Row> data={[]} columns={columns} ariaLabel="Rows" error="Unable to load rows" />);
        expect(screen.getByRole("alert")).toHaveTextContent("Unable to load rows");
    });

    it("escapes CSV formula prefixes before export", async () => {
        const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
        const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
        const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
        render(<AdvancedDataTable
            data={[{ id: "1", name: "=1+1", score: 1 }, { id: "2", name: "-cmd", score: 2 }]}
            columns={columns} ariaLabel="Export" csvFileName="rows" />);
        fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
        const blob = createObjectURL.mock.calls[0][0] as Blob;
        const csv = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(blob);
        });
        expect(csv).toContain("'=1+1");
        expect(csv).toContain("'-cmd");
        expect(click).toHaveBeenCalledOnce();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
        createObjectURL.mockRestore();
        revokeObjectURL.mockRestore();
        click.mockRestore();
    });

    it("delegates server pagination and row activation", () => {
        const onPaginationChange = vi.fn();
        const onRowClick = vi.fn();
        render(<AdvancedDataTable<Row>
            data={[rows[0]]} columns={columns} getRowId={(row) => row.id} ariaLabel="Server rows"
            searchable={false} enableSorting={false} manualPagination pageCount={4}
            pagination={{ pageIndex: 2, pageSize: 1 }} onPaginationChange={onPaginationChange}
            onRowClick={onRowClick} selectedRowId="1" />);
        expect(screen.getByText("Page 3 of 4")).toBeVisible();
        expect(screen.getByRole("row", { name: /zebra/ })).toHaveAttribute("aria-selected", "true");
        fireEvent.click(screen.getByRole("row", { name: /zebra/ }));
        expect(onRowClick).toHaveBeenCalledWith(rows[0]);
        fireEvent.click(screen.getByRole("button", { name: /next/i }));
        expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 3, pageSize: 1 });
    });
});
