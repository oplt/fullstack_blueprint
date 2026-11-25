import { useCallback, type PropsWithChildren } from "react";
import { toast } from "sonner";
import { SnackbarContext, type ToastOptions } from "./snackbarContext";

export function SnackbarProvider({ children }: PropsWithChildren) {
    const showToast = useCallback((options: ToastOptions) => {
        const method = options.severity === "error" ? toast.error : options.severity === "warning" ? toast.warning : options.severity === "success" ? toast.success : toast.info;
        method(options.message);
    }, []);

    return (
        <SnackbarContext.Provider value={{ showToast }}>
            {children}
        </SnackbarContext.Provider>
    );
}
