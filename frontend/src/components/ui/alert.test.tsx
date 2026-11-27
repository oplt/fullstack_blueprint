import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "./alert";

describe("Alert", () => {
    it("renders an accessible semantic alert with composable content", () => {
        render(
            <Alert variant="destructive">
                <AlertTitle>Unable to save</AlertTitle>
                <AlertDescription>Try again in a moment.</AlertDescription>
            </Alert>,
        );

        const alert = screen.getByRole("alert");
        expect(alert).toHaveAttribute("data-slot", "alert");
        expect(alert).toHaveAttribute("data-variant", "destructive");
        expect(alert).toHaveTextContent("Unable to save");
        expect(alert).toHaveTextContent("Try again in a moment.");
    });

    it("supports non-error status messages without forcing alert semantics", () => {
        render(
            <Alert role="status" variant="success">
                <AlertDescription>Changes saved.</AlertDescription>
            </Alert>,
        );

        expect(screen.getByRole("status")).toHaveAttribute("data-variant", "success");
    });
});
