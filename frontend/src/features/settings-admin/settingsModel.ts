import type { ConfigEntry, ConfigSettingsResponse, DatabaseSetting } from "../../api/settings";

export type DatabaseSettingDrafts = Record<string, { value: string; description: string }>;
type ConfigGroupId = "application" | "infrastructure" | "security" | "email" | "observability" | "storage" | "custom";
export type SettingsTabValue = ConfigGroupId | "database";
export type ConfigGroup = { id: ConfigGroupId; label: string; description: string; items: ConfigEntry[] };

const GROUPS: Array<Omit<ConfigGroup, "items">> = [
    { id: "application", label: "Application", description: "Branding, naming, environment identity, and app-facing defaults." },
    { id: "infrastructure", label: "Infrastructure", description: "Hosts, ports, databases, cache, and background job plumbing." },
    { id: "security", label: "Auth & Security", description: "Token behavior, cookies, verification windows, and admin access controls." },
    { id: "email", label: "Email", description: "SMTP delivery settings for verification, reset, and notification mail." },
    { id: "observability", label: "Observability", description: "Tracing, error capture, and telemetry export configuration." },
    { id: "storage", label: "Storage", description: "Object storage connectivity, URL generation, and avatar upload limits." },
    { id: "custom", label: "Custom", description: "Unmapped or custom environment variables kept in `backend/.env`." },
];

const GROUP_RULES: ReadonlyArray<{
    id: ConfigGroupId;
    prefixes: readonly string[];
    keys: readonly string[];
}> = [
    { id: "application", prefixes: ["APP_", "CORE_DOMAIN_"], keys: ["LOG_LEVEL", "PLATFORM_DEFAULT_MODULE_PACK", "FRONTEND_URL"] },
    { id: "infrastructure", prefixes: ["CELERY_"], keys: ["DATABASE_URL", "REDIS_URL"] },
    { id: "security", prefixes: ["JWT_"], keys: ["ACCESS_TOKEN_EXPIRE_MINUTES", "REFRESH_TOKEN_EXPIRE_DAYS", "COOKIE_SECURE", "VERIFICATION_TOKEN_TTL", "PASSWORD_RESET_TOKEN_TTL", "ADMIN_SIGNUP_INVITE_CODE"] },
    { id: "email", prefixes: ["SMTP_"], keys: [] },
    { id: "observability", prefixes: ["SENTRY_", "OTLP_"], keys: [] },
    { id: "storage", prefixes: ["STORAGE_"], keys: [] },
];

function getGroup(item: ConfigEntry): ConfigGroupId {
    if (item.is_custom) return "custom";
    const rule = GROUP_RULES.find(({ keys, prefixes }) =>
        keys.includes(item.key) || prefixes.some((prefix) => item.key.startsWith(prefix)),
    );
    return rule?.id ?? "custom";
}

export function buildConfigGroups(items: ConfigEntry[]): ConfigGroup[] {
    const grouped = Object.fromEntries(GROUPS.map((group) => [group.id, [] as ConfigEntry[]])) as Record<ConfigGroupId, ConfigEntry[]>;
    items.forEach((item) => grouped[getGroup(item)].push(item));
    return GROUPS.map((group) => ({ ...group, items: grouped[group.id] })).filter((group) => group.items.length > 0);
}

export function settingsContentKey(config: ConfigSettingsResponse, database: DatabaseSetting[]) {
    return `${config.items.map((item) => `${item.key}:${item.value}`).join("|")}::${database.map((item) => `${item.id}:${item.updated_at}`).join("|")}`;
}
