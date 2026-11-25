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
