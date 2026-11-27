import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { layoutContentClass } from "@/components/layout/layoutVariants";
import { PageShell } from "./PageShell";
describe("PageShell width and app layout gutters", () => {
    it("preserves explicit content widths", () => {
        const { container, rerender } = render(<PageShell>Default content</PageShell>);
        const content = container.querySelector(".page-shell__content");
        expect(content).toHaveAttribute("data-width", "default");
        rerender(<PageShell width="wide">Wide content</PageShell>);
        expect(content).toHaveAttribute("data-width", "wide");
        rerender(<PageShell width="full">Full content</PageShell>);
        expect(content).toHaveAttribute("data-width", "full");
    });
    it("uses canonical width and gutter formats for constrained and fluid layouts", () => {
        expect(layoutContentClass("saas-dashboard")).toBe("ui-layout-content");
        expect(layoutContentClass("settings")).toBe("ui-layout-content");
        for (const variant of ["split-panel-workspace", "full-width-workspace", "ai-conversation"] as const) {
            expect(layoutContentClass(variant)).toBe("ui-layout-content ui-layout-content-fluid");
        }
    });
});
