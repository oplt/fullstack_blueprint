import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    readOneTimeAuthToken,
    sanitizeOneTimeAuthTokenUrl,
    useOneTimeAuthToken,
} from "./useOneTimeAuthToken";

describe("one-time auth URL tokens", () => {
    it("reads tokens from fragments so they are not sent in HTTP requests", () => {
        expect(readOneTimeAuthToken("https://app.example/verify-email#token=verify-secret"))
            .toBe("verify-secret");
    });

    it("continues to read tokens from existing query links", () => {
        expect(readOneTimeAuthToken("https://app.example/reset-password?token=reset-secret&email=user%40example.com"))
            .toBe("reset-secret");
    });

    it("removes tokens from both URL locations and preserves unrelated query values", () => {
        expect(sanitizeOneTimeAuthTokenUrl("https://app.example/verify-email?token=secret&email=user%40example.com#token=secret"))
            .toBe("/verify-email?email=user%40example.com");
    });

    it("captures a fragment token, then scrubs it from browser history on mount", () => {
        window.history.replaceState({}, "", "/verify-email#token=verify-secret");

        const { result } = renderHook(() => useOneTimeAuthToken());

        expect(result.current).toBe("verify-secret");
        expect(window.location.pathname + window.location.search + window.location.hash)
            .toBe("/verify-email");
    });
});
