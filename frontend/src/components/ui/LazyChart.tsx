import { lazy, Suspense } from "react";
import type { ChartDatum, ChartSeries } from "./charts";
const LineChartCard = lazy(() => import("./charts").then((module) => ({ default: module.LineChartCard })));
const AreaChartCard = lazy(() => import("./charts").then((module) => ({ default: module.AreaChartCard })));
const BarChartCard = lazy(() => import("./charts").then((module) => ({ default: module.BarChartCard })));
const DonutChartCard = lazy(() => import("./charts").then((module) => ({ default: module.DonutChartCard })));
export type LazyChartProps = { chartType: "line" | "area" | "bar" | "donut"; title: string; description?: string; data: ChartDatum[]; xKey: string; series: ChartSeries[] };
export function LazyChart({ chartType, title, description, data, xKey, series }: LazyChartProps) {
    return <Suspense fallback={<section aria-label={`${title} loading`} aria-busy="true" className="ui-chart-placeholder" />}>{chartType === "line" ? <LineChartCard title={title} description={description} data={data} xKey={xKey} series={series} /> : chartType === "area" ? <AreaChartCard title={title} description={description} data={data} xKey={xKey} series={series} /> : chartType === "bar" ? <BarChartCard title={title} description={description} data={data} xKey={xKey} series={series} /> : <DonutChartCard title={title} description={description} data={data.map((row) => ({ name: String(row[xKey] ?? ""), value: Number(row[series[0]?.dataKey] ?? 0) }))} nameKey="name" valueKey="value" />}</Suspense>;
}
