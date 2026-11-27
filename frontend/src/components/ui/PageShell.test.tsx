import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { layoutContentClass } from "@/components/layout/layoutVariants";
import { PageShell } from "./PageShell";

describe("PageShell width and app layout gutters", () => {
    it("uses the 1200px default and preserves explicit wide and full widths", () => {
        const { container, rerender } = render(<PageShell>Default content</PageShell>);
        const content = container.querySelector(".page-shell__content");

        expect(content).toHaveAttribute("data-width", "default");

        rerender(<PageShell width="wide">Wide content</PageShell>);
        expect(content).toHaveAttribute("data-width", "wide");

        rerender(<PageShell width="full">Full content</PageShell>);
        expect(content).toHaveAttribute("data-width", "full");
    });

    it("caps ordinary and settings layouts at 1200px while workspace layouts stay fluid", () => {
        const dashboard = layoutContentClass("saas-dashboard");
        expect(dashboard).toContain("max-w-[1200px]");
        expect(dashboard).toContain("px-3");
        expect(dashboard).toContain("sm:px-6");
        expect(layoutContentClass("settings")).toContain("max-w-[1200px]");
        expect(layoutContentClass("split-panel-workspace")).not.toContain("max-w-");
        expect(layoutContentClass("full-width-workspace")).not.toContain("max-w-");
    });
});
