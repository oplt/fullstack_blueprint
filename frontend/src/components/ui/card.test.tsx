import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, CardTitle } from "./card";
import { SectionCard } from "./SectionCard";

describe("card sizing and heading semantics", () => {
    it("uses the CSS-owned spacing token for standard, large and dense sizes", () => {
        const { rerender } = render(<Card data-testid="card" />);
        expect(screen.getByTestId("card")).toHaveAttribute("data-size", "default");
        expect(screen.getByTestId("card")).toHaveAttribute("data-slot", "card");
        expect(screen.getByTestId("card")).toHaveClass("ui-card");

        rerender(<Card data-testid="card" size="lg" />);
        expect(screen.getByTestId("card")).toHaveAttribute("data-size", "lg");
        expect(screen.getByTestId("card")).toHaveClass("ui-card");

        rerender(<Card data-testid="card" size="sm" />);
        expect(screen.getByTestId("card")).toHaveAttribute("data-size", "sm");
        expect(screen.getByTestId("card")).toHaveClass("ui-card");
        expect(screen.getByTestId("card").className).not.toContain("--spacing(");
    });

    it("allows titles to use the page-appropriate heading level", () => {
        render(<CardTitle as="h3">Recent runs</CardTitle>);
        expect(screen.getByRole("heading", { level: 3, name: "Recent runs" })).toBeInTheDocument();
    });

    it("aligns SectionCard sizes and preserves its configurable heading level", () => {
        const { rerender } = render(<SectionCard title="Standard">Content</SectionCard>);
        const standard = screen.getByRole("heading", { level: 2, name: "Standard" }).closest("section");
        expect(standard).toHaveAttribute("data-slot", "card");
        expect(standard).toHaveAttribute("data-size", "default");
        expect(standard).toHaveClass("ui-card", "ui-section-card");

        rerender(<SectionCard title="Pricing" titleAs="h3" size="lg">Content</SectionCard>);
        const large = screen.getByRole("heading", { level: 3, name: "Pricing" }).closest("section");
        expect(large).toHaveAttribute("data-size", "lg");
        expect(large).toHaveClass("ui-section-card");

        rerender(<SectionCard title="Dense" compact>Content</SectionCard>);
        const dense = screen.getByRole("heading", { name: "Dense" }).closest("section");
        expect(dense).toHaveAttribute("data-size", "sm");
        expect(dense).toHaveClass("ui-section-card");
    });

    it("preserves flat section cards and action-only headers", () => {
        render(<SectionCard variant="flat" action={<span>Action</span>}>Content</SectionCard>);
        expect(screen.getByText("Action").closest("section")).toHaveAttribute("data-variant", "flat");
        expect(screen.getByText("Content")).toBeInTheDocument();
    });
});
