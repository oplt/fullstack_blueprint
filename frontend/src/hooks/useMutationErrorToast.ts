import { notify } from "../lib/notify";
import { useCallback } from "react";

import { getQueryErrorMessage } from "../utils/queryErrors";

export function useMutationErrorToast() {
    return useCallback(
        (error: unknown, fallback: string) => {
            notify({
                message: getQueryErrorMessage(error, fallback),
                severity: "error",
            });
        },
        []
    );
}
