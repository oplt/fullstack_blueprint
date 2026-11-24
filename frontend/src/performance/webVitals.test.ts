import { describe, expect, it } from "vitest";
import { startWebVitals } from "./webVitals";

describe("web vitals monitoring", () => {
    it("is safe when the browser does not expose PerformanceObserver", () => {
        const original = globalThis.PerformanceObserver;
        // @ts-expect-error test environment override
        globalThis.PerformanceObserver = undefined;
        expect(() => startWebVitals()).not.toThrow();
        globalThis.PerformanceObserver = original;
    });
});
