import type { ReactNode } from "react";
import {
    BadgeCheck,
    Bell,
    FolderOpen,
    Shield,
} from "lucide-react";
import type { AuthUser } from "@/features/identity/authApi";
import { MetricGrid } from "../../components/Metrics";
import { StatCard } from "../../components/Metrics";

type Props = {
    user: AuthUser | null;
    projectCount?: number;
    projectsLoading: boolean;
    projectsEnabled: boolean;
    unreadCount: number;
    notificationsLoading: boolean;
    notificationsEnabled: boolean;
    coreDomainPlural: string;
};

function OptionalMetric({ enabled, children }: { enabled: boolean; children: ReactNode }) {
    return enabled ? children : null;
}

export function DashboardMetrics(props: Props) {
    const { user, projectCount, projectsLoading, projectsEnabled, unreadCount,
        notificationsLoading, notificationsEnabled, coreDomainPlural } = props;

    return (
        <MetricGrid>
            <OptionalMetric enabled={projectsEnabled}><StatCard
                label={coreDomainPlural}
                value={projectCount ?? "—"}
                description={`Total ${coreDomainPlural.toLowerCase()} in your workspace`}
                icon={<FolderOpen />}
                loading={projectsLoading}
            /></OptionalMetric>
            <OptionalMetric enabled={notificationsEnabled}><StatCard
                label="Unread notifications"
                value={unreadCount}
                description="New updates waiting for a response"
                icon={<Bell />}
                loading={notificationsLoading}
                color="warning"
            /></OptionalMetric>
            <StatCard
                label="Email status"
                value={user?.is_verified ? "Verified" : "Pending"}
                description="Identity confirmation for your account"
                icon={<BadgeCheck />}
                color={user?.is_verified ? "success" : "warning"}
            />
            <StatCard
                label="Multi-factor auth"
                value={user?.mfa_enabled ? "Enabled" : "Not enabled"}
                description="Additional sign-in protection"
                icon={<Shield />}
                color={user?.mfa_enabled ? "success" : "secondary"}
            />
        </MetricGrid>
    );
}
