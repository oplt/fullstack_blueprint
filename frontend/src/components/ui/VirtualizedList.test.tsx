import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VirtualizedList } from "./VirtualizedList";

describe("VirtualizedList", () => {
    it("renders a bounded window and updates it on scroll", () => {
        render(<VirtualizedList items={Array.from({ length: 100 }, (_, index) => index)} estimatedItemHeight={20} height={100} renderItem={(item) => <span>{item}</span>} />);
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.queryByText("99")).toBeNull();
        fireEvent.scroll(screen.getByRole("list"), { target: { scrollTop: 1980 } });
        expect(screen.getByText("99")).toBeInTheDocument();
    });
});
