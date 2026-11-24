import type { FieldPath, FieldValues } from "react-hook-form";
import type { ApiError } from "../../api/client";

export function applyServerFieldErrors<T extends FieldValues>(error: unknown, setError: (name: FieldPath<T>, error: { type: string; message: string }) => void, fallback = "Something went wrong."): string {
    if (error && typeof error === "object" && "fieldErrors" in error) {
        const fieldErrors = (error as ApiError).fieldErrors;
        for (const [name, messages] of Object.entries(fieldErrors)) {
            const message = messages[0];
            if (message) setError(name as FieldPath<T>, { type: "server", message });
        }
    }
    return error instanceof Error ? error.message : fallback;
}

