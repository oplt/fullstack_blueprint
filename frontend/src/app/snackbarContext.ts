import { createContext, useContext } from "react";
type AlertColor = "error" | "warning" | "info" | "success";

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
