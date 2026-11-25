import { useId, type ReactNode } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
export { ComparisonCard } from "./ComparisonCard";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export type ChartDatum = Record<string, string | number | null | undefined>;
export type ChartSeries = { dataKey: string; label?: string; color?: string; stackId?: string };

type ChartFrameProps = {
    title: string;
    description?: string;
    data: ChartDatum[];
    xKey: string;
    series: ChartSeries[];
    height?: number;
    className?: string;
    tableLabel?: string;
};

function ChartTable({ data, xKey, series, label }: { data: ChartDatum[]; xKey: string; series: ChartSeries[]; label: string }) {
    return <details className="mt-3 rounded-lg border border-border p-2 text-xs"><summary className="cursor-pointer font-medium">View data table</summary><div className="mt-2 overflow-x-auto"><table aria-label={label} className="w-full text-left"><thead><tr><th className="p-1">{xKey}</th>{series.map((item) => <th key={item.dataKey} className="p-1">{item.label ?? item.dataKey}</th>)}</tr></thead><tbody>{data.map((row, index) => <tr key={`${String(row[xKey])}-${index}`} className="border-t border-border"><td className="p-1">{String(row[xKey] ?? "")}</td>{series.map((item) => <td key={item.dataKey} className="p-1">{String(row[item.dataKey] ?? "")}</td>)}</tr>)}</tbody></table></div></details>;
}

function ChartFrame({ title, description, data, xKey, series, height = 260, className, tableLabel, children }: ChartFrameProps & { children: ReactNode }) {
    const descriptionId = useId();
    return <Card className={cn(className)}><CardHeader><CardTitle>{title}</CardTitle>{description ? <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p> : null}</CardHeader><CardContent><div role="img" aria-label={title} aria-describedby={description ? descriptionId : undefined} style={{ width: "100%", height }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div><ChartTable data={data} xKey={xKey} series={series} label={tableLabel ?? `${title} data`} /></CardContent></Card>;
}

const defaultColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function LineChartCard(props: ChartFrameProps) {
    return <ChartFrame {...props}><LineChart data={props.data}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey={props.xKey} /><YAxis /><Tooltip /><Legend />{props.series.map((item, index) => <Line key={item.dataKey} type="monotone" dataKey={item.dataKey} name={item.label ?? item.dataKey} stroke={item.color ?? defaultColors[index % defaultColors.length]} strokeWidth={2} dot={false} />)}</LineChart></ChartFrame>;
}

export function AreaChartCard(props: ChartFrameProps) {
    return <ChartFrame {...props}><AreaChart data={props.data}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey={props.xKey} /><YAxis /><Tooltip /><Legend />{props.series.map((item, index) => <Area key={item.dataKey} type="monotone" dataKey={item.dataKey} name={item.label ?? item.dataKey} stroke={item.color ?? defaultColors[index % defaultColors.length]} fill={item.color ?? defaultColors[index % defaultColors.length]} fillOpacity={0.2} stackId={item.stackId} />)}</AreaChart></ChartFrame>;
}

export function BarChartCard(props: ChartFrameProps) {
    return <ChartFrame {...props}><BarChart data={props.data}><CartesianGrid strokeDasharray="3 3" opacity={0.25} /><XAxis dataKey={props.xKey} /><YAxis /><Tooltip /><Legend />{props.series.map((item, index) => <Bar key={item.dataKey} dataKey={item.dataKey} name={item.label ?? item.dataKey} fill={item.color ?? defaultColors[index % defaultColors.length]} stackId={item.stackId} radius={[4, 4, 0, 0]} />)}</BarChart></ChartFrame>;
}

export function DonutChartCard({ title, description, data, nameKey, valueKey, colors = defaultColors, className }: { title: string; description?: string; data: Array<Record<string, string | number>>; nameKey: string; valueKey: string; colors?: string[]; className?: string }) {
    const descriptionId = useId();
    return <Card className={cn(className)}><CardHeader><CardTitle>{title}</CardTitle>{description ? <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p> : null}</CardHeader><CardContent><div role="img" aria-label={title} aria-describedby={description ? descriptionId : undefined} style={{ width: "100%", height: 260 }}><ResponsiveContainer width="100%" height="100%"><PieChart><Tooltip /><Legend /><Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="55%" outerRadius="80%" paddingAngle={2}>{data.map((_item, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie></PieChart></ResponsiveContainer></div><ChartTable data={data} xKey={nameKey} series={[{ dataKey: valueKey, label: valueKey }]} label={`${title} data`} /></CardContent></Card>;
}

export function TrendIndicator({ value, label, positiveIsGood = true }: { value: number; label?: string; positiveIsGood?: boolean }) {
    const positive = positiveIsGood ? value >= 0 : value <= 0;
    return <span className={positive ? "text-success" : "text-destructive"}>{value >= 0 ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%{label ? ` ${label}` : ""}</span>;
}
