import { useId, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { ReadOnlyTable } from "@/components/ui/ReadOnlyTable";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
export { ComparisonCard } from "./ComparisonCard";
export { TrendIndicator } from "./TrendIndicator";
export type ChartDatum = Record<string, string | number | null | undefined>;
// The public string input is retained; only approved semantic color roles are rendered.
export type ChartSeries = { dataKey: string; label?: string; color?: string; stackId?: string };
type ChartFrameProps = { title: string; description?: string; data: ChartDatum[]; xKey: string; series: ChartSeries[]; height?: number; className?: string; tableLabel?: string };
function ChartTable({ data, xKey, series, label }: { data: ChartDatum[]; xKey: string; series: ChartSeries[]; label: string }) {
    const columns = [{ key: xKey, label: xKey }, ...series.map((item) => ({ key: item.dataKey, label: item.label ?? item.dataKey }))];
    return <details className="ui-chart-table"><summary className="ui-chart-table-summary">View data table</summary><div className="ui-chart-table-content"><ReadOnlyTable ariaLabel={label} columns={columns} rows={data} renderCell={(row, column) => String(row[column.key] ?? "")} /></div></details>;
}
function ChartFrame({ title, description, data, xKey, series, height, className, tableLabel, children }: ChartFrameProps & { children: ReactNode }) {
    const descriptionId = useId();
    return <Card className={cn(className)}><CardHeader><CardTitle as="h3">{title}</CardTitle>{description ? <p id={descriptionId} className="ui-chart-description">{description}</p> : null}</CardHeader><CardContent>{data.length > 0 && series.length > 0 ? <div role="group" aria-label={title} aria-describedby={description ? descriptionId : undefined} className="ui-chart-plot" style={height === undefined ? undefined : { height }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div> : <p className="ui-chart-empty" role="status">No chart data available.</p>}<ChartTable data={data} xKey={xKey} series={series} label={tableLabel ?? `${title} data`} /></CardContent></Card>;
}
const defaultColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const semanticColors = new Set(["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "success-deep", "warning-deep", "destructive-deep", "information", "link-text"]);
// Recharts requires geometry as JavaScript values; keep the approved integration values centralized here.
const chartGridDash = "3 3";
const barTopRadius: [number, number, number, number] = [4, 4, 0, 0];
const donutGeometry = { innerRadius: "55%", outerRadius: "80%", paddingAngle: 2 } as const;
function chartColor(color: string | undefined, index: number) {
    const role = color?.replace(/^var\(--([a-z0-9-]+)\)$/, "$1");
    return role && semanticColors.has(role) ? `var(--${role})` : defaultColors[index % defaultColors.length];
}
const colorAt = (item: ChartSeries, index: number) => chartColor(item.color, index);
export function LineChartCard(props: ChartFrameProps) { return <ChartFrame {...props}><LineChart data={props.data} accessibilityLayer><CartesianGrid stroke="var(--chart-grid-color)" strokeDasharray={chartGridDash} /><XAxis dataKey={props.xKey} stroke="var(--chart-axis-color)" /><YAxis stroke="var(--chart-axis-color)" /><Tooltip isAnimationActive={false} /><Legend />{props.series.map((item, index) => <Line key={item.dataKey} type="monotone" dataKey={item.dataKey} name={item.label ?? item.dataKey} stroke={colorAt(item, index)} dot={false} isAnimationActive={false} />)}</LineChart></ChartFrame>; }
export function AreaChartCard(props: ChartFrameProps) { return <ChartFrame {...props}><AreaChart data={props.data} accessibilityLayer><CartesianGrid stroke="var(--chart-grid-color)" strokeDasharray={chartGridDash} /><XAxis dataKey={props.xKey} stroke="var(--chart-axis-color)" /><YAxis stroke="var(--chart-axis-color)" /><Tooltip isAnimationActive={false} /><Legend />{props.series.map((item, index) => <Area key={item.dataKey} type="monotone" dataKey={item.dataKey} name={item.label ?? item.dataKey} stroke={colorAt(item, index)} fill={colorAt(item, index)} stackId={item.stackId} isAnimationActive={false} />)}</AreaChart></ChartFrame>; }
export function BarChartCard(props: ChartFrameProps) { return <ChartFrame {...props}><BarChart data={props.data} accessibilityLayer><CartesianGrid stroke="var(--chart-grid-color)" strokeDasharray={chartGridDash} /><XAxis dataKey={props.xKey} stroke="var(--chart-axis-color)" /><YAxis stroke="var(--chart-axis-color)" /><Tooltip isAnimationActive={false} /><Legend />{props.series.map((item, index) => <Bar key={item.dataKey} dataKey={item.dataKey} name={item.label ?? item.dataKey} fill={colorAt(item, index)} stackId={item.stackId} radius={barTopRadius} isAnimationActive={false} />)}</BarChart></ChartFrame>; }
export function DonutChartCard({ title, description, data, nameKey, valueKey, colors = defaultColors, className }: { title: string; description?: string; data: Array<Record<string, string | number>>; nameKey: string; valueKey: string; colors?: string[]; className?: string }) {
    const palette = colors.length ? colors : defaultColors;
    return <ChartFrame title={title} description={description} data={data} xKey={nameKey} series={[{ dataKey: valueKey, label: valueKey }]} className={className}><PieChart accessibilityLayer><Tooltip isAnimationActive={false} /><Legend /><Pie data={data} dataKey={valueKey} nameKey={nameKey} {...donutGeometry} isAnimationActive={false}>{data.map((_item, index) => <Cell key={index} fill={chartColor(palette[index % palette.length], index)} />)}</Pie></PieChart></ChartFrame>;
}
