import type { Meta, StoryObj } from "@storybook/react-vite";
import { AreaChartCard, BarChartCard, DonutChartCard, LineChartCard } from "./charts";

const data = [{ month: "Jan", runs: 12, failures: 2 }, { month: "Feb", runs: 22, failures: 3 }, { month: "Mar", runs: 30, failures: 1 }];
const series = [{ dataKey: "runs", label: "Runs" }, { dataKey: "failures", label: "Failures" }];
const meta = { title: "Blueprint/Business/Charts", component: LineChartCard, tags: ["autodocs"], parameters: { layout: "fullscreen" } } satisfies Meta<typeof LineChartCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Line: Story = { args: { title: "Runs over time", description: "Accessible chart with a visible data table.", data, xKey: "month", series } };
export const Area: Story = { args: { title: "Runs over time", data, xKey: "month", series }, render: () => <AreaChartCard title="Runs over time" data={data} xKey="month" series={series} /> };
export const Bar: Story = { args: { title: "Runs by month", data, xKey: "month", series }, render: () => <BarChartCard title="Runs by month" data={data} xKey="month" series={series} /> };
export const Donut: Story = { args: { title: "Run distribution", data, xKey: "month", series }, render: () => <DonutChartCard title="Run distribution" data={[{ name: "Complete", value: 77 }, { name: "Failed", value: 8 }]} nameKey="name" valueKey="value" /> };
