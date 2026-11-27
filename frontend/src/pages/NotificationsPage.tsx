import {
    Mail as MailOutlineIcon,
    BellRing as NotificationsActiveIcon,
    Megaphone as CampaignIcon,
} from "lucide-react";
import { NotificationListItem } from "../components/notifications/NotificationListItem";
import { NotificationPreferencesForm } from "../components/notifications/NotificationPreferencesForm";
import { MarkAllReadButton } from "../components/notifications/MarkAllReadButton";
import { EmptyState } from "../components/ui/EmptyState";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";
import { useNotifications } from "../hooks/useNotifications";
import { useNotificationMutations } from "../hooks/useNotificationMutations";
import { PageShell } from "../components/ui/PageShell";
import { QueryBoundary } from "../components/ui/QueryBoundary";
import { SectionCard } from "../components/ui/SectionCard";
import { StatCard } from "../components/ui/StatCard";

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

            <div
                className="gap-4" style={{ display: "grid", gridTemplateColumns: "1fr" }}
            >
                <StatCard
                    label="Unread"
                    value={unreadCount}
                    description="Fresh activity that still needs attention"
                    icon={<NotificationsActiveIcon />}
                    loading={isLoading}
                />
                <StatCard
                    label="All notifications"
                    value={totalCount}
                    description="Historical inbox items available for review"
                    icon={<MailOutlineIcon />}
                    loading={isLoading}
                    color="secondary"
                />
                <StatCard
                    label="Channels enabled"
                    value={prefsQuery.isLoading ? "—" : `${enabledChannels}/3`}
                    description="Delivery routes currently turned on"
                    icon={<CampaignIcon />}
                    loading={prefsQuery.isLoading}
                    color="success"
                />
            </div>

            <div
                className="gap-4" style={{ display: "grid", gridTemplateColumns: "1fr" }}
            >
                <SectionCard title="Inbox" description="Messages are sorted for fast scanning and clear read state.">
                    <QueryBoundary
                        isLoading={isLoading}
                        isError={isError}
                        error={error}
                        errorFallback="Failed to load notifications."
                        onRetry={() => void refetch()}
                        isEmpty={!notifications || notifications.length === 0}
                        emptyFallback={
                            <EmptyState
                                icon={<NotificationsActiveIcon />}
                                title="Inbox is clear"
                                description="You have no notifications yet. New product updates and account events will appear here."
                            />
                        }
                    >
                        <div className="flex gap-3">
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
                </SectionCard>

                <NotificationPreferencesForm query={prefsQuery} mutation={prefsMutation} />
            </div>
        </PageShell>
    );
}
