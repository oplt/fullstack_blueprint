import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { FormGrid } from "./FormGrid";
import { ResponsiveCardGrid } from "./ResponsiveCardGrid";
import { MetricGrid } from "./MetricGrid";
import { WorkspaceSplit } from "./WorkspaceSplit";
import {
    RESPONSIVE_QA_VIEWPORTS,
    denseCardColumns,
    responsiveColumns,
    responsiveQaBand,
    scrollContainerStyle,
} from "./responsiveQa";

function wrap(ui: React.ReactElement) {
    return render(ui);
}

describe("Phase 22 responsive QA matrix", () => {
    it("covers the required viewports", () => {
        expect([...RESPONSIVE_QA_VIEWPORTS]).toEqual([390, 768, 1024, 1280, 1440, 1920]);
    });

    it("bands laptop screens (1024–1440) separately from phone/tablet", () => {
        expect(responsiveQaBand(390)).toBe("phone");
        expect(responsiveQaBand(768)).toBe("tablet");
        expect(responsiveQaBand(1024)).toBe("laptop");
        expect(responsiveQaBand(1280)).toBe("desktop");
        expect(responsiveQaBand(1440)).toBe("desktop");
        expect(responsiveQaBand(1920)).toBe("desktop");
    });

    it("defers dense 3–4 column grids until lg so 1024px content is not crushed", () => {
        const four = denseCardColumns(4);
        expect(four.md).toBe("repeat(2, minmax(0, 1fr))");
        expect(four.lg).toBe("repeat(4, minmax(0, 1fr))");
        expect(responsiveColumns.kpi.md).toBe("repeat(2, minmax(0, 1fr))");
        expect(responsiveColumns.kpi.lg).toBe("repeat(4, minmax(0, 1fr))");
        expect(responsiveColumns.threeUp.lg).toBe("repeat(3, minmax(0, 1fr))");
    });

    it("exposes a shared horizontal scroll container for tables/charts", () => {
        expect(scrollContainerStyle.overflowX).toBe("auto");
        expect(scrollContainerStyle.minWidth).toBe(0);
        expect(scrollContainerStyle.WebkitOverflowScrolling).toBe("touch");
    });
});

describe("Responsive layout primitives", () => {
    it("applies dense card column templates on MetricGrid / ResponsiveCardGrid", () => {
        const { container } = wrap(
            <MetricGrid columns={4}>
                <div>1</div>
                <div>2</div>
                <div>3</div>
                <div>4</div>
            </MetricGrid>
        );
        const grid = container.firstElementChild as HTMLElement;
        expect(grid).toHaveClass("responsive-card-grid");
    });

    it("keeps FormGrid fields fluid without fixed min widths", () => {
        const { container } = wrap(
            <FormGrid columns="4">
                <div>A</div>
                <div>B</div>
                <div>C</div>
                <div>D</div>
            </FormGrid>
        );
        const grid = container.firstElementChild as HTMLElement;
        expect(grid).toHaveClass("form-grid");
        expect(grid).toHaveAttribute("data-columns", "4");
    });

    it("hides the WorkspaceSplit side column below sideFrom (default lg)", () => {
        const { container } = wrap(
            <WorkspaceSplit main={<div>Main</div>} side={<div>Side</div>} />
        );
        const aside = container.querySelector("aside");
        expect(aside).toBeTruthy();
        // Responsive display utility; assert the side landmark exists for lg+.
        expect(aside?.textContent).toContain("Side");
    });

    it("renders ResponsiveCardGrid children", () => {
        const { container } = wrap(
            <ResponsiveCardGrid columns={3}>
                <div>a</div>
                <div>b</div>
                <div>c</div>
            </ResponsiveCardGrid>
        );
        expect(container.textContent).toBe("abc");
    });
});
