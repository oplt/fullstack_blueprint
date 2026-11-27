import { Button } from "@/components/ui/button";
import { Bell as NotificationsIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Notification } from "../../../api/notifications";
import { ROUTES } from "@/config/routes";
import { NotificationListItem } from "../../../components/notifications/NotificationListItem";
import { EmptyState } from "../../../components/ui/EmptyState";
import { QueryBoundary } from "../../../components/ui/QueryBoundary";
import { SectionCard } from "../../../components/ui/SectionCard";

type Props = {
    enabled: boolean;
    notifications?: Notification[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    onRetry: () => void;
};

export function RecentActivityCard({ enabled, notifications, isLoading, isError, error, onRetry }: Props) {
    const navigate = useNavigate();
    const recentNotifications = notifications?.slice(0, 5) ?? [];

    if (!enabled) return null;
    return (
        <SectionCard
            title="Recent activity"
            description="The latest notifications and alerts across your account."
            contentClassName="flex min-h-0 flex-col"
            action={<Button variant="ghost" onClick={() => navigate(ROUTES.notifications)} type="button">Open all</Button>}
        >
            <QueryBoundary
                isLoading={isLoading}
                isError={isError}
                error={error}
                errorFallback="Failed to load notifications."
                onRetry={onRetry}
                isEmpty={!recentNotifications.length}
                emptyFallback={
                    <EmptyState
                        icon={<NotificationsIcon />}
                        title="No notifications yet"
                        description="Updates, reminders, and account events will appear here as soon as the workspace becomes active."
                    />
                }
            >
                <div className="flex min-h-0 flex-1 flex-col overflow-auto ui-auto-recent-activity-card-div">
                    {recentNotifications.map((notification) => (
                        <NotificationListItem key={notification.id} notification={notification} variant="compact" />
                    ))}
                </div>
            </QueryBoundary>
        </SectionCard>
    );
}
