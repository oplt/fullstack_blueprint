/* eslint-disable react-refresh/only-export-components */
import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect, useLayoutEffect, type PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { mswLoader } from "msw-storybook-addon/csf3";
import "../src/index.css";
import { applyTheme } from "../src/app/theme";
import { i18nInstance, setLanguage } from "../src/i18n/config";
import { handlers } from "../src/mocks/handlers";

function StoryEnvironment({ children, theme, language }: PropsWithChildren<{ theme: "light" | "dark"; language: "en" | "nl" | "fr" }>) {
    useLayoutEffect(() => {
        const root = document.documentElement;
        const previousTheme = root.dataset.theme;
        const previousDark = root.classList.contains("dark");
        applyTheme(theme);
        return () => {
            if (previousTheme === undefined) delete root.dataset.theme;
            else root.dataset.theme = previousTheme;
            root.classList.toggle("dark", previousDark);
        };
    }, [theme]);
    useEffect(() => { void setLanguage(language); }, [language]);
    return <I18nextProvider i18n={i18nInstance}><MemoryRouter>{children}</MemoryRouter></I18nextProvider>;
}

const withEnvironment: Decorator = (Story, context) => <StoryEnvironment theme={(context.globals.theme ?? "light") as "light" | "dark"} language={(context.globals.language ?? "en") as "en" | "nl" | "fr"}><Story /></StoryEnvironment>;

const preview: Preview = {
    parameters: {
        layout: "centered",
        controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
        a11y: { test: "todo" },
        msw: { handlers },
    },
    globalTypes: {
        theme: { description: "Theme", toolbar: { title: "Theme", items: ["light", "dark"], dynamicTitle: true } },
        language: { description: "Language", toolbar: { title: "Language", items: [{ value: "en", title: "English" }, { value: "nl", title: "Nederlands" }, { value: "fr", title: "Français" }], dynamicTitle: true } },
    },
    initialGlobals: { theme: "light", language: "en" },
    decorators: [withEnvironment],
    loaders: [mswLoader()],
};

export default preview;
