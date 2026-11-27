import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("semantic class merging", () => {
    it("retains distinct typography size and foreground roles", () => {
        expect(cn("text-body-md", "text-muted-foreground")).toBe("text-body-md text-muted-foreground");
        expect(cn("text-muted-foreground", "text-body-md")).toBe("text-muted-foreground text-body-md");
    });

    it("allows explicit overrides of semantic typography and spacing", () => {
        expect(cn("text-body-md", "text-display-md")).toBe("text-display-md");
        expect(cn("p-ui-md", "p-ui-lg")).toBe("p-ui-lg");
        expect(cn("p-ui-md", "p-0")).toBe("p-0");
    });

    it("keeps typography, semantic colors and contextual font weight distinct", () => {
        expect(cn("text-body-sm", "font-medium", "text-destructive-deep")).toBe("text-body-sm font-medium text-destructive-deep");
    });
});
