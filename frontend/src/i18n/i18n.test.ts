import { describe, expect, it, beforeEach } from "vitest";
import { formatCurrency, formatDate, formatDateTime, formatNumber, localizeValidationIssue } from "./formatters";
import { languageDirection, readLanguage, setLanguage } from "./config";
import { i18nInstance } from "./config";

describe("internationalization foundation", () => {
    beforeEach(async () => { await setLanguage("en"); });

    it("detects supported persisted languages and falls back safely", () => {
        const storage = { getItem: () => "fr-FR" } as unknown as Storage;
        expect(readLanguage(storage)).toBe("fr");
        expect(languageDirection("en")).toBe("ltr");
        expect(languageDirection("ar")).toBe("rtl");
    });

    it("formats dates, numbers and currency using the selected locale", async () => {
        await setLanguage("fr");
        expect(formatNumber(1234.5)).toContain("1");
        expect(formatCurrency(12345, "EUR")).toContain("€");
        expect(formatDate("2026-11-24")).toMatch(/2026/);
        expect(i18nInstance.t("navigation.projects")).toBe("Projets");
        expect(i18nInstance.t("status.unread", { count: 2 })).toContain("2");
    });

    it("localizes common validation issue shapes", async () => {
        await setLanguage("nl");
        expect(localizeValidationIssue({ code: "too_small", minimum: 3 })).toContain("3");
        expect(localizeValidationIssue({ code: "invalid_type", path: ["email"] })).toContain("verplicht");
    });

    it("supports explicit localized date options", () => {
        expect(() => formatDateTime("2026-11-24T12:30:00Z", { year: "numeric", month: "long" }, "fr")).not.toThrow();
    });
});
