import { useCallback, useState, type PropsWithChildren } from "react";
import { SnackbarContext, type ToastOptions } from "./snackbarContext";

export function SnackbarProvider({ children }: PropsWithChildren) {
    const [open, setOpen] = useState(false);
    const [opts, setOpts] = useState<ToastOptions>({ message: "", severity: "info" });

    const showToast = useCallback((o: ToastOptions) => {
        setOpts(o);
        setOpen(true);
    }, []);

    return (
        <SnackbarContext.Provider value={{ showToast }}>
            {children}
            {open ? <div role="alert" aria-live="polite" className="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg border border-border bg-card p-3 text-sm shadow-lg" onClick={() => setOpen(false)}>{opts.message}</div> : null}
        </SnackbarContext.Provider>
    );
}
