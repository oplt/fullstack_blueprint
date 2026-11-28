import type { NotificationPreferences } from "@/features/notifications/api";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/ui/SectionCard";
import { Switch } from "../../components/ui/switch";
import type { useNotificationPreferences } from "./useNotificationPreferences";
import type { useNotificationMutations } from "./useNotificationMutations";

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
                            className="flex items-start gap-ui-sm rounded-xl border border-border bg-card p-ui-md"
                        >
                            <Switch
                                id={option.id}
                                checked={query.data?.[option.key] ?? false}
                                disabled={mutation.isPending}
                                aria-describedby={`${option.id}-description`}
                                onCheckedChange={(checked) => mutation.mutate({ [option.key]: checked })}
                            />
                            <span className="grid gap-ui-xxs">
                                <span className="font-medium">{option.label}</span>
                                <span id={`${option.id}-description`} className="text-body-md text-muted-foreground">
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
