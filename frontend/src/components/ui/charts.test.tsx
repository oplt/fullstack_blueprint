import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComparisonCard, LineChartCard, TrendIndicator } from "./charts";
describe("dashboard chart primitives", () => {
    it("communicates trend direction and comparison context", () => {
        render(<><TrendIndicator value={12.5} label="vs previous" /><ComparisonCard title="Runs" value="24" comparison={-8} /></>);
        expect(screen.getByText(/12.5% vs previous/)).toBeInTheDocument();
        expect(screen.getByText(/8.0% vs previous/)).toBeInTheDocument();
        expect(screen.getByText("Increase")).toBeInTheDocument();
        expect(screen.getByText("Decrease")).toBeInTheDocument();
    });
    it("provides an accessible empty state and data-table fallback", () => {
        render(<LineChartCard title="Runs" data={[]} xKey="month" series={[{dataKey:"runs",label:"Runs"}]} />);
        expect(screen.getByRole("status")).toHaveTextContent("No chart data available.");
        expect(screen.getByText("View data table")).toBeInTheDocument();
    });
});
