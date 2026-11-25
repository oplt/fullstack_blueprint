import type { SupportedLanguage } from "./resources";
import { i18nInstance } from "./config";

function locale(language?: string): string { return language ?? i18nInstance.resolvedLanguage ?? "en"; }

export function formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions, language?: SupportedLanguage): string {
    return new Intl.DateTimeFormat(locale(language), { dateStyle: "medium", ...options }).format(new Date(value));
}

export function formatDateTime(value: Date | string | number, options?: Intl.DateTimeFormatOptions, language?: SupportedLanguage): string {
    return new Intl.DateTimeFormat(locale(language), { dateStyle: "medium", timeStyle: "short", ...options }).format(new Date(value));
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions, language?: SupportedLanguage): string {
    return new Intl.NumberFormat(locale(language), options).format(value);
}

export function formatCurrency(value: number, currency = "EUR", language?: SupportedLanguage): string {
    return formatNumber(value, { style: "currency", currency }, language);
}

export function pluralKey(count: number, singular: string, plural = `${singular}_other`): string {
    return count === 1 ? `${singular}_one` : plural;
}

function validationMessage(key: "required" | "email" | "minLength" | "invalid", options?: Record<string, number | string>): string {
    return options ? i18nInstance.t(`validation.${key}`, options) : i18nInstance.t(`validation.${key}`);
}

export function localizeValidationIssue(issue: { code?: string; path?: PropertyKey[]; minimum?: number; message?: string }): string {
    if (issue.code === "too_small" && typeof issue.minimum === "number") return validationMessage("minLength", { count: issue.minimum });
    if (issue.code === "invalid_format" || issue.code === "invalid_string") return validationMessage("email");
    if (issue.code === "invalid_type" && issue.path?.length) return validationMessage("required");
    return issue.message ?? validationMessage("invalid");
}
