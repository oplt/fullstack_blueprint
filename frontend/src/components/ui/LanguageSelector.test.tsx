import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { i18nInstance, setLanguage } from "../../i18n/config";
import { LanguageSelector } from "./LanguageSelector";

describe("LanguageSelector", () => {
    it("changes the active locale through an accessible select", async () => {
        await setLanguage("en");
        const user = userEvent.setup();
        render(<I18nextProvider i18n={i18nInstance}><LanguageSelector /></I18nextProvider>);
        const select = screen.getByRole("combobox", { name: "Language" });
        await user.selectOptions(select, "fr");
        expect(i18nInstance.resolvedLanguage).toBe("fr");
        await setLanguage("en");
    });
});
