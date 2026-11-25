import type { NotificationPreferences } from "../../api/notifications";
import { QueryBoundary } from "../ui/QueryBoundary";
import { SectionCard } from "../ui/SectionCard";
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
                <div className="grid gap-3">
                    {preferenceOptions.map((option) => (
                        <label
                            key={option.key}
                            htmlFor={option.id}
                            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                        >
                            <input
                                id={option.id}
                                type="checkbox"
                                role="switch"
                                checked={query.data?.[option.key] ?? false}
                                disabled={mutation.isPending}
                                aria-describedby={`${option.id}-description`}
                                onChange={(event) => mutation.mutate({ [option.key]: event.target.checked })}
                            />
                            <span className="grid gap-1">
                                <span className="font-medium">{option.label}</span>
                                <span id={`${option.id}-description`} className="text-sm text-muted-foreground">
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
