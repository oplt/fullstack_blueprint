import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/** Small, dependency-free parsers for values that cross the URL boundary. */
export function parseEnumParam<T extends string>(
    value: string | null,
    allowed: readonly T[],
    fallback: T,
    aliases?: Readonly<Record<string, T>>,
): T {
    if (value && allowed.includes(value as T)) return value as T;
    const alias = value ? aliases?.[value] : undefined;
    return alias && allowed.includes(alias) ? alias : fallback;
}

export function parsePositiveIntParam(
    value: string | null,
    fallback: number,
    { min = 0, max = Number.MAX_SAFE_INTEGER } = {},
): number {
    if (!value || !/^\d+$/.test(value)) return fallback;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export function parseRequiredParam(value: string | null): string | null {
    const normalized = value?.trim() ?? "";
    return normalized.length > 0 && normalized.length <= 2048 ? normalized : null;
}

export type UseTabQueryParamOptions<T extends string> = {
    /** Map legacy query values onto current tabs (e.g. `models` → `predictions`). */
    aliases?: Readonly<Record<string, T>>;
};

/**
 * Persist a page tab in the URL query string (`?tab=...`) so refresh/back/deep-link work.
 * Falls back to `defaultTab` when the param is missing or invalid.
 */
export function useTabQueryParam<T extends string>(
    tabs: readonly T[],
    defaultTab: T,
    paramKey = "tab",
    options?: UseTabQueryParamOptions<T>
): [T, (next: T) => void] {
    const [searchParams, setSearchParams] = useSearchParams();
    const aliases = options?.aliases;

    const value = useMemo(() => {
        return parseEnumParam(searchParams.get(paramKey), tabs, defaultTab, aliases);
    }, [aliases, defaultTab, paramKey, searchParams, tabs]);

    const setValue = useCallback(
        (next: T) => {
            setSearchParams(
                (prev) => {
                    const nextParams = new URLSearchParams(prev);
                    if (next === defaultTab) {
                        nextParams.delete(paramKey);
                    } else {
                        nextParams.set(paramKey, next);
                    }
                    return nextParams;
                },
                { replace: true }
            );
        },
        [defaultTab, paramKey, setSearchParams]
    );

    return [value, setValue];
}
