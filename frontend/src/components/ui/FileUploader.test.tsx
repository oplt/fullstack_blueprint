import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FileUploader } from "./FileUploader";

describe("FileUploader", () => {
    it("rejects oversized files and exposes selected files", () => {
        const onFilesChange = vi.fn();
        const { container } = render(<FileUploader onFilesChange={onFilesChange} maxSizeBytes={2} />);
        const input = container.querySelector('input[type="file"]');
        expect(input).not.toBeNull();
        fireEvent.change(input!, { target: { files: [new File(["large"], "large.txt", { type: "text/plain" })] } });
        expect(screen.getByRole("alert")).toHaveTextContent("larger than the allowed limit");
        expect(onFilesChange).not.toHaveBeenCalled();
    });
});
