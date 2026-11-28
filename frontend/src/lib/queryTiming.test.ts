import { describe, expect, it } from "vitest";
import { jobPollInterval } from "./queryTiming";

describe("job polling cadence", () => {
    it("backs off while a job runs and caps the interval", () => {
        expect(jobPollInterval(0)).toBe(2_000);
        expect(jobPollInterval(10_000)).toBe(4_000);
        expect(jobPollInterval(30_000)).toBe(8_000);
        expect(jobPollInterval(60_000)).toBe(15_000);
        expect(jobPollInterval(120_000)).toBe(30_000);
        expect(jobPollInterval(Number.MAX_SAFE_INTEGER)).toBe(30_000);
    });
});
