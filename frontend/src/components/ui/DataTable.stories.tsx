import type { Meta, StoryObj } from "@storybook/react-vite";
import { createColumnHelper } from "@tanstack/react-table";
import { AdvancedDataTable } from "./AdvancedDataTable";

type Row = { id: string; name: string; status: string; value: number };
const rows: Row[] = [{ id: "1", name: "Alpha", status: "Active", value: 42 }, { id: "2", name: "Beta", status: "Paused", value: 18 }, { id: "3", name: "Gamma", status: "Complete", value: 77 }];
const helper = createColumnHelper<Row>();
const columns = [helper.accessor("name", { header: "Name" }), helper.accessor("status", { header: "Status" }), helper.accessor("value", { header: "Value" })];
const meta = { title: "Blueprint/Business/Data table", component: AdvancedDataTable, tags: ["autodocs"], args: { columns, data: rows, ariaLabel: "Projects table" } } satisfies Meta<typeof AdvancedDataTable<Row>>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { data: [], emptyTitle: "No projects", emptyDescription: "Create a project to see it here." } };
export const Loading: Story = { args: { loading: true } };
export const ErrorState: Story = { args: { error: "Could not load projects." } };
