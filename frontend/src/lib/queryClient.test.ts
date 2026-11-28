import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./api";
import { queryClient } from "./queryClient";

describe("query retries", () => {
    afterEach(() => queryClient.clear());

    it.each([
        ["a client error", new ApiError({ status: 404, detail: "Not found", fieldErrors: {} }), 1],
        ["a server error", new ApiError({ status: 503, detail: "Unavailable", fieldErrors: {} }), 2],
        ["a network error", new TypeError("Failed to fetch"), 2],
    ] as const)("makes the expected attempts for %s", async (_description, error, attempts) => {
        const queryFn = vi.fn().mockRejectedValue(error);

        await expect(queryClient.fetchQuery({
            queryKey: ["test"],
            queryFn,
            retryDelay: 0,
        })).rejects.toBe(error);

        expect(queryFn).toHaveBeenCalledTimes(attempts);
    });
});
