import {
    Mail,
    BellRing,
    Megaphone,
} from "lucide-react";
import { NotificationListItem } from "./NotificationListItem";
import { NotificationPreferencesForm } from "./NotificationPreferencesForm";
import { MarkAllReadButton } from "./MarkAllReadButton";
import { EmptyState } from "../../components/Feedback";
import { useNotificationPreferences } from "./useNotificationPreferences";
import { useNotifications } from "./useNotifications";
import { useNotificationMutations } from "./useNotificationMutations";
import { PageShell } from "../../components/PageLayout";
import { MetricGrid } from "../../components/Metrics";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/Section";
import { StatCard } from "../../components/Metrics";
import { WorkspaceSplit } from "../../components/ui/WorkspaceSplit";

export default function NotificationsPage() {
    const {
        data: notifications,
        isLoading,
        isError,
        error,
        refetch,
    } = useNotifications();
    const prefsQuery = useNotificationPreferences();
    const prefs = prefsQuery.data;
    const { markOne: markOneMutation, markAll: markAllMutation, preferences: prefsMutation } = useNotificationMutations();
    const unreadCount = notifications?.filter((item) => !item.is_read).length ?? 0;
    const totalCount = notifications?.length ?? 0;
    const enabledChannels = prefs
        ? [prefs.email_enabled, prefs.push_enabled, prefs.marketing_enabled].filter(Boolean).length
        : 0;

    return (
        <PageShell width="wide">
            {unreadCount > 0 ? <MarkAllReadButton mutation={markAllMutation} /> : null}

            <MetricGrid columns={3}>
                <StatCard
                    label="Unread"
                    value={unreadCount}
                    description="Fresh activity that still needs attention"
                    icon={<BellRing />}
                    loading={isLoading}
                />
                <StatCard
                    label="All notifications"
                    value={totalCount}
                    description="Historical inbox items available for review"
                    icon={<Mail />}
                    loading={isLoading}
                    color="secondary"
                />
                <StatCard
                    label="Channels enabled"
                    value={prefsQuery.isLoading ? "—" : `${enabledChannels}/3`}
                    description="Delivery routes currently turned on"
                    icon={<Megaphone />}
                    loading={prefsQuery.isLoading}
                    color="success"
                />
            </MetricGrid>

            <WorkspaceSplit
                ratio="8-4"
                main={<SectionCard title="Inbox" description="Messages are sorted for fast scanning and clear read state.">
                    <QueryBoundary
                        isLoading={isLoading}
                        isError={isError}
                        error={error}
                        errorFallback="Failed to load notifications."
                        onRetry={() => void refetch()}
                        isEmpty={!notifications || notifications.length === 0}
                        emptyFallback={
                            <EmptyState
                                icon={<BellRing />}
                                title="Inbox is clear"
                                description="You have no notifications yet. New product updates and account events will appear here."
                            />
                        }
                    >
                        <div className="flex gap-ui-sm">
                            {notifications?.map((notification) => {
                                const isUpdatingThisItem =
                                    markOneMutation.isPending &&
                                    markOneMutation.variables === notification.id;
                                return (
                                    <NotificationListItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkRead={(id) => markOneMutation.mutate(id)}
                                        isMarkingRead={isUpdatingThisItem}
                                    />
                                );
                            })}
                        </div>
                    </QueryBoundary>
                </SectionCard>}
                side={<NotificationPreferencesForm query={prefsQuery} mutation={prefsMutation} />}
            />
        </PageShell>
    );
}
