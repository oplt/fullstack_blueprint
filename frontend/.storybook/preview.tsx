/* eslint-disable react-refresh/only-export-components */
import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect, type PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { mswLoader } from "msw-storybook-addon/csf3";
import "../src/index.css";
import { applyDesignTokens, createDesignTokens, type ThemePreset } from "../src/app/designTokens";
import { i18nInstance, setLanguage } from "../src/i18n/config";
import { handlers } from "../src/mocks/handlers";

function StoryEnvironment({ children, theme, language }: PropsWithChildren<{ theme: "light" | "dark"; language: "en" | "nl" | "fr" }>) {
    useEffect(() => { applyDesignTokens(createDesignTokens({ mode: theme, colorMode: theme, preset: "minimal-saas" as ThemePreset, density: "comfortable", radius: "md" })); document.documentElement.dataset.theme = theme; void setLanguage(language); }, [language, theme]);
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
