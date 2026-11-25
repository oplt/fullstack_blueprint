import { createContext, useContext } from "react";
import type { ColorMode } from "./theme";

type ColorModeContextValue = {
    colorMode: ColorMode;
    resolvedMode: "light" | "dark";
    setColorMode: (mode: ColorMode) => void;
};

export const ColorModeContext = createContext<ColorModeContextValue>({
    colorMode: "light",
    resolvedMode: "light",
    setColorMode: () => undefined,
});

export function useColorMode() {
    return useContext(ColorModeContext);
}
