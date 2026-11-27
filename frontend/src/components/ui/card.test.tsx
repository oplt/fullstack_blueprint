import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, CardTitle } from "./card";
import { SectionCard } from "./SectionCard";

describe("card sizing and heading semantics", () => {
    it("uses standard sizing by default and supports large and dense sizes", () => {
        const { rerender } = render(<Card data-testid="card" />);

        expect(screen.getByTestId("card")).toHaveAttribute("data-size", "default");
        expect(screen.getByTestId("card").className).toContain("rounded-md");
        expect(screen.getByTestId("card").className).toContain("--spacing(6)");

        rerender(<Card data-testid="card" size="lg" />);
        expect(screen.getByTestId("card")).toHaveAttribute("data-size", "lg");
        expect(screen.getByTestId("card").className).toContain("--spacing(8)");
        expect(screen.getByTestId("card").className).toContain("rounded-lg");

        rerender(<Card data-testid="card" size="sm" />);
        expect(screen.getByTestId("card")).toHaveAttribute("data-size", "sm");
        expect(screen.getByTestId("card").className).toContain("--spacing(3)");
    });

    it("allows titles to use the page-appropriate heading level", () => {
        render(<CardTitle as="h3">Recent runs</CardTitle>);

        expect(screen.getByRole("heading", { level: 3, name: "Recent runs" })).toBeInTheDocument();
    });

    it("aligns SectionCard sizes and preserves its configurable heading level", () => {
        const { rerender } = render(<SectionCard title="Standard">Content</SectionCard>);

        expect(screen.getByRole("heading", { level: 2, name: "Standard" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 2 }).closest("section")?.className).toContain("p-6");
        expect(screen.getByRole("heading", { level: 2 }).closest("section")?.className).toContain("surface-card");

        rerender(<SectionCard title="Pricing" titleAs="h3" size="lg">Content</SectionCard>);
        expect(screen.getByRole("heading", { level: 3, name: "Pricing" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 3 }).closest("section")?.className).toContain("p-8");

        rerender(<SectionCard title="Dense" compact>Content</SectionCard>);
        expect(screen.getByRole("heading", { name: "Dense" }).closest("section")?.className).toContain("p-3");
    });
});
