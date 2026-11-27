import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GenerativeUiRenderer } from "./GenerativeUiRenderer";

describe("GenerativeUiRenderer", () => {
    it("renders approved structured content as accessible text", () => {
        render(<GenerativeUiRenderer payload={{ version: 1, components: [{ type: "text", id: "hello", text: "Hello from the model" }, { type: "markdown", id: "md", markdown: "## Heading" }] }} />);
        expect(screen.getByText("Hello from the model")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    });

    it("falls back safely for malformed payloads and does not create HTML", () => {
        render(<GenerativeUiRenderer payload={{ version: 1, components: [{ type: "html", id: "unsafe", html: "<img src=x onerror=alert(1)>" }] }} />);
        expect(screen.getByRole("alert")).toHaveTextContent("could not be displayed safely");
        expect(document.querySelector("img")).toBeNull();
    });

    it("renders generated data tables with shared semantic table markup", () => {
        render(<GenerativeUiRenderer payload={{
            version: 1,
            components: [{
                type: "data_table",
                id: "tasks",
                title: "Tasks",
                columns: [{ key: "name", label: "Name" }],
                rows: [{ name: "Review design" }],
            }],
        }} />);

        expect(screen.getByRole("table", { name: "Tasks" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "Review design" })).toBeInTheDocument();
    });
});
