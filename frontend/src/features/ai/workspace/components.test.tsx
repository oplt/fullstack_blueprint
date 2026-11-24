import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConversationHistory, SourceCitations } from "./components";

describe("AI workspace rendering trust boundary", () => {
    it("renders assistant markdown as text and blocks unsafe citation URLs", () => {
        render(<><ConversationHistory messages={[{ id: "m", role: "assistant", content: "<script>alert(1)</script>", citations: [] }]} /><SourceCitations citations={[{ id: "c", title: "Unsafe", url: "javascript:alert(1)" }]} /></>);
        expect(screen.getByText(/script/)).toHaveTextContent("<script>alert(1)</script>");
        expect(screen.queryByRole("link", { name: /Unsafe/ })).not.toBeInTheDocument();
    });
});

