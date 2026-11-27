import type { NotificationPreferences } from "../../api/notifications";
import { QueryBoundary } from "../ui/QueryBoundary";
import { SectionCard } from "../ui/SectionCard";
import { Switch } from "../ui/switch";
import type { useNotificationPreferences } from "../../hooks/useNotificationPreferences";
import type { useNotificationMutations } from "../../hooks/useNotificationMutations";

type Props = {
    query: ReturnType<typeof useNotificationPreferences>;
    mutation: ReturnType<typeof useNotificationMutations>["preferences"];
};

const preferenceOptions: Array<{
    key: keyof NotificationPreferences;
    id: string;
    label: string;
    description: string;
}> = [
    {
        key: "email_enabled",
        id: "email-notifications",
        label: "Email notifications",
        description: "Receive operational updates and account messages in your inbox.",
    },
    {
        key: "push_enabled",
        id: "push-notifications",
        label: "Push notifications",
        description: "Surface urgent activity directly inside the app experience.",
    },
    {
        key: "marketing_enabled",
        id: "marketing-emails",
        label: "Marketing emails",
        description: "Get launch announcements, feature roundups, and educational updates.",
    },
];

export function NotificationPreferencesForm({ query, mutation }: Props) {
    return (
        <SectionCard
            title="Delivery preferences"
            description="Choose how you want this workspace to reach you."
        >
            <QueryBoundary
                isLoading={query.isLoading}
                isError={query.isError}
                error={query.error}
                errorFallback="Failed to load notification preferences."
                onRetry={() => void query.refetch()}
            >
                <div className="grid gap-ui-sm">
                    {preferenceOptions.map((option) => (
                        <label
                            key={option.key}
                            htmlFor={option.id}
                            className="flex items-start ui-auto-notification-preferences-form-label"
                        >
                            <Switch
                                id={option.id}
                                checked={query.data?.[option.key] ?? false}
                                disabled={mutation.isPending}
                                aria-describedby={`${option.id}-description`}
                                onCheckedChange={(checked) => mutation.mutate({ [option.key]: checked })}
                            />
                            <span className="grid gap-ui-xxs">
                                <span className="ui-auto-notification-preferences-form-span">{option.label}</span>
                                <span id={`${option.id}-description`} className="ui-auto-notification-preferences-form-span-73383af">
                                    {option.description}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
            </QueryBoundary>
        </SectionCard>
    );
}
