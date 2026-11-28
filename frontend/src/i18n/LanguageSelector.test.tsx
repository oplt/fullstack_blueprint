import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { i18nInstance, setLanguage } from "./config";
import { LanguageSelector } from "./LanguageSelector";

describe("LanguageSelector", () => {
    it("changes the active locale through the accessible language menu", async () => {
        await setLanguage("en");
        const user = userEvent.setup();
        const { unmount } = render(<I18nextProvider i18n={i18nInstance}><LanguageSelector /></I18nextProvider>);
        await user.click(screen.getByRole("button", { name: "Language" }));
        await user.click(await screen.findByRole("button", { name: "Français" }));
        await waitFor(() => expect(i18nInstance.resolvedLanguage).toBe("fr"));
        unmount();
        await setLanguage("en");
    });
});
