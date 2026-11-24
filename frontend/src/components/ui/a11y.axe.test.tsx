import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { SkipToContentLink } from "./SkipToContentLink";

describe("WCAG automated smoke checks", () => {
    it("has no critical axe violations on the shared navigation primitives", async () => {
        const { container } = render(<><SkipToContentLink /><main id="main-content"><h1>Accessible page</h1><Button type="button">Continue</Button></main></>);
        const result = await axe.run(container, { runOnly: { type: "rule", values: ["aria-roles", "button-name", "html-has-lang", "landmark-one-main", "link-name", "region"] } });
        expect(result.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
    });
});
