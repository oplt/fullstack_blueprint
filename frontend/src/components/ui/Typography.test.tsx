import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthMarketingPanel } from "../../features/identity/AuthMarketingPanel";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PageHeader } from "./PageHeader";

describe("semantic typography roles", () => {
    it("uses page-title and dense heading roles in PageHeader", () => {
        const { rerender } = render(<PageHeader title="Projects" />);

        expect(screen.getByRole("heading", { level: 1 }).className).toContain("text-page-title");
        rerender(<PageHeader title="Projects" dense />);
        expect(screen.getByRole("heading", { level: 1 }).className).toContain("text-display-md");
    });

    it("uses the mono eyebrow, responsive display roles, and dense highlight cards", () => {
        render(<AuthMarketingPanel
            appName="Blueprint"
            eyebrow="Launch-ready workspace"
            title="Manage your workspace"
            description="Organize projects and keep up with account activity."
            highlights={[{ label: "Projects", value: "12" }]}
        />);

        expect(screen.getByText("Launch-ready workspace").className).toContain("text-mono-eyebrow");
        expect(screen.getByRole("heading", { level: 1 }).className).toContain("text-display-lg");
        expect(screen.getByRole("heading", { level: 1 }).className).toContain("xl:text-display-xl");
        expect(screen.getByText("Projects").closest("[data-slot='card']")).toHaveAttribute("data-size", "sm");
    });

    it("styles generated Markdown headings and code with canonical roles", () => {
        render(<MarkdownRenderer content={"# Report\n\n## Findings\n\n### Detail\n\n```ts\nconst count = 1;\n```"} />);

        expect(screen.getByRole("heading", { level: 1, name: "Report" }).className).toContain("text-display-lg");
        expect(screen.getByRole("heading", { level: 2, name: "Findings" }).className).toContain("text-display-md");
        expect(screen.getByRole("heading", { level: 3, name: "Detail" }).className).toContain("text-display-sm");
        expect(screen.getByText("const count = 1;").closest("pre")?.className).toContain("text-code");
    });
});
