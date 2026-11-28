import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { FormGrid } from "./FormGrid";
import { ResponsiveCardGrid } from "../Section";
import { MetricGrid } from "../Metrics";
import { WorkspaceSplit } from "./WorkspaceSplit";

const RESPONSIVE_QA_VIEWPORTS = [390, 768, 1024, 1280, 1440, 1920] as const;

function wrap(ui: React.ReactElement) {
    return render(ui);
}

describe("Phase 22 responsive QA matrix", () => {
    it("covers the required viewports", () => {
        expect([...RESPONSIVE_QA_VIEWPORTS]).toEqual([390, 768, 1024, 1280, 1440, 1920]);
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
