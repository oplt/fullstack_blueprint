import { createDesignTokens, type ThemeResolvedMode } from "./designTokens";

export type PaletteMode = ThemeResolvedMode;
export type DesignPalette = {
    mode: PaletteMode;
    background: { paper: string };
    action: { hover: string };
    common: { white: string; black: string };
    divider: string;
    primary: { main: string; light: string };
    success: { main: string };
    warning: { main: string };
    error: { main: string };
    text: { primary: string; secondary: string; disabled: string };
};

export function createDesignPalette(mode: PaletteMode): DesignPalette {
    const colors = createDesignTokens({ mode }).colors;
    return { mode, background: { paper: colors.card }, action: { hover: colors.muted }, common: { white: "#fff", black: "#000" }, divider: colors.border, primary: { main: colors.primary, light: colors.primaryHover }, success: { main: colors.success }, warning: { main: colors.warning }, error: { main: colors.destructive }, text: { primary: colors.foreground, secondary: colors.mutedForeground, disabled: colors.mutedForeground } };
}

export const lightPalette = { palette: createDesignPalette("light") };
export const darkPalette = { palette: createDesignPalette("dark") };
