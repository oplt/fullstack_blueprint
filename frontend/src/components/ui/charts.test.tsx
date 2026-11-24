import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComparisonCard, TrendIndicator } from "./charts";

describe("dashboard chart primitives", () => {
    it("communicates trend direction and comparison context", () => {
        render(<><TrendIndicator value={12.5} label="vs previous" /><ComparisonCard title="Runs" value="24" comparison={-8} /></>);
        expect(screen.getByText(/12.5% vs previous/)).toBeInTheDocument();
        expect(screen.getByText(/8.0% vs previous/)).toBeInTheDocument();
    });
});

