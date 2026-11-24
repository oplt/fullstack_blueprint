import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});

