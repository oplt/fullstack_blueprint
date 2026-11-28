import { SettingsTabs } from "../../app/SettingsTabs";
import { PageShell } from "../../components/PageLayout";
import { QueryErrorAlert } from "../../components/ui/QueryBoundary";
import { Skeleton } from "../../components/ui/skeleton";
import {
    AccountSection,
    MfaSection,
    PasswordSection,
    ProfileSummary,
    PublicProfileSection,
    SessionsSection,
} from "./ProfileSections";
import { useProfileView } from "./useProfileView";

export default function ProfilePage() {
    const m = useProfileView();
    if (m.userQuery.isLoading || m.profileQuery.isLoading) return (
        <PageShell width="wide"><SettingsTabs /><Skeleton className="h-105" /></PageShell>
    );
    if (m.userQuery.isError || m.profileQuery.isError) return (
        <PageShell width="wide"><SettingsTabs />
            <div className="flex gap-ui-md">
                {m.userQuery.isError && <QueryErrorAlert error={m.userQuery.error} fallback="Failed to load account details." onRetry={() => void m.userQuery.refetch()} />}
                {m.profileQuery.isError && <QueryErrorAlert error={m.profileQuery.error} fallback="Failed to load profile details." onRetry={() => void m.profileQuery.refetch()} />}
            </div>
        </PageShell>
    );
    return (
        <PageShell width="wide"><SettingsTabs />
            <div className="grid grid-cols-1 items-start gap-ui-md">
                <ProfileSummary m={m} /><AccountSection m={m} /><MfaSection m={m} />
            </div>
            <div className="grid grid-cols-1 gap-ui-md">
                <PublicProfileSection m={m} />
                <div className="flex gap-ui-md"><SessionsSection m={m} /><PasswordSection m={m} /></div>
            </div>
        </PageShell>
    );
}
