import { useEffect } from "react";

/** Protects forms from accidental tab/window close without owning navigation. */
export function useUnsavedChanges(isDirty: boolean, message = "You have unsaved changes.") {
    useEffect(() => {
        if (!isDirty) return;
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = message;
            return message;
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [isDirty, message]);
}

