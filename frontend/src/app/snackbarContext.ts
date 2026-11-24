import { createContext, useContext } from "react";
import type { AlertColor } from "@/components/ui/muiCompat";

export type ToastOptions = {
    message: string;
    severity?: AlertColor;
};

type SnackbarContextValue = {
    showToast: (opts: ToastOptions) => void;
};

export const SnackbarContext = createContext<SnackbarContextValue>({
    showToast: () => undefined,
});

export function useSnackbar() {
    return useContext(SnackbarContext);
}
