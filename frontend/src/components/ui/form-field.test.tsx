import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { FormField } from "./form-field";

it("keeps external descriptions and validation state when field feedback changes", () => {
    function Example({ error }: { error?: boolean }) {
        return <>
            <p id="help">Use your work address.</p>
            <FormField label="Email" error={error} aria-invalid="grammar" aria-describedby="help"
                description={error ? "Address required." : "Check spelling."} />
        </>;
    }
    const { rerender } = render(<Example />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAccessibleDescription("Use your work address. Check spelling.");
    expect(input).toHaveAttribute("aria-invalid", "grammar");
    rerender(<Example error />);
    expect(input).toHaveAccessibleDescription("Use your work address. Address required.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Address required.");
});

it("preserves native select and textarea refs, labels and form values", async () => {
    const ref = createRef<HTMLSelectElement>();
    const notes = createRef<HTMLTextAreaElement>();
    const user = userEvent.setup();
    render(<form aria-label="Preferences">
        <FormField as="select" ref={ref} name="mode" label="Mode">
            <option value="light">Light</option><option value="dark">Dark</option>
        </FormField>
        <FormField as="textarea" ref={notes} name="notes" label="Notes" />
    </form>);
    expect(ref.current).toBe(screen.getByRole("combobox", { name: "Mode" }));
    expect(notes.current).toBe(screen.getByRole("textbox", { name: "Notes" }));
    await user.selectOptions(screen.getByLabelText("Mode"), "dark");
    expect(new FormData(ref.current!.form!).get("mode")).toBe("dark");
});
