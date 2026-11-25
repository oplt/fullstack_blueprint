import { createContext, useContext } from "react";
import type {
    ColorMode,
    Density,
    RadiusScale,
    ThemePreset,
} from "./theme";

type ColorModeContextValue = {
    colorMode: ColorMode;
    setColorMode: (mode: ColorMode) => void;
    preset: ThemePreset;
    setPreset: (preset: ThemePreset) => void;
    density: Density;
    setDensity: (density: Density) => void;
    radius: RadiusScale;
    setRadius: (radius: RadiusScale) => void;
    primaryColor?: string;
    setPrimaryColor: (primaryColor: string | undefined) => void;
    fontFamily?: string;
    setFontFamily: (fontFamily: string | undefined) => void;
};

export const ColorModeContext = createContext<ColorModeContextValue>({
    colorMode: "light",
    setColorMode: () => undefined,
    preset: "minimal-saas",
    setPreset: () => undefined,
    density: "comfortable",
    setDensity: () => undefined,
    radius: "md",
    setRadius: () => undefined,
    setPrimaryColor: () => undefined,
    setFontFamily: () => undefined,
});

export function useColorMode() {
    return useContext(ColorModeContext);
}
