import { describe, expect, it } from "vitest";
import { validateGenerativePayload } from "./validation";

describe("generative UI validation", () => {
    it("accepts allowlisted components and recursively validates children", () => {
        const result = validateGenerativePayload({ version: 1, components: [{ type: "text", id: "root", text: "Hello", children: [{ type: "markdown", id: "nested", markdown: "## Safe" }] }] });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.components[0]?.children?.[0]).toMatchObject({ type: "markdown" });
    });

    it("rejects unknown types and excessive nesting", () => {
        expect(validateGenerativePayload({ version: 1, components: [{ type: "script", id: "bad" }] }).success).toBe(false);
        let value: unknown = { type: "text", id: "deep", text: "x" };
        for (let index = 0; index < 6; index += 1) value = { type: "text", id: `n-${index}`, text: "x", children: [value] };
        expect(validateGenerativePayload({ version: 1, components: [value] }).success).toBe(false);
    });
});
