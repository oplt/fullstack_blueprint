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

it("keeps variable-length messages in document order through the end of a long history", () => {
    const messages = Array.from({ length: 85 }, (_, i) => ({
        id: String(i), role: "user" as const, content: `Message ${i}\n${"line\n".repeat(i)}`, citations: [],
    }));
    const { rerender } = render(<ConversationHistory messages={messages} />);
    expect(screen.getAllByRole("listitem").at(-1)).toHaveTextContent("Message 84");
    rerender(<ConversationHistory messages={messages.slice(0, 2)} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
});
