import { Search, Users } from "lucide-react";
import { ADMIN_USERS_PAGE_SIZE, useAdminUsers } from "./useAdminUsers";
import { useIsMobile } from "../../lib/use-mobile";
import { SettingsTabs } from "../../app/SettingsTabs";
import { EmptyState } from "../../components/Feedback";
import { Input } from "../../components/ui/input";
import { PageShell } from "../../components/PageLayout";
import { PaginationControls } from "../../components/ui/pagination";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/Section";
import { StatCard } from "../../components/Metrics";
import { AdminUsersDirectory } from "./AdminUsersDirectory";

export default function AdminUsersPage() {
    const isMobile = useIsMobile();
    const {
        search, setSearch, page, setPage, users, usersQuery, statusMutation,
        activeCount, verifiedCount,
    } = useAdminUsers();
    const { data, isLoading, isError, error, refetch } = usersQuery;

    return (
        <PageShell width="wide">
            <SettingsTabs />
            <div className="mb-ui-md flex justify-end">
                <div className="relative">
                    <Search
                        aria-hidden="true"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        className="pl-9"
                        placeholder="Search users..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(0);
                        }}
                    />
                </div>
            </div>

            <div className="grid gap-ui-md">
                <StatCard
                    label="Total users"
                    value={data?.total ?? 0}
                    description="Accounts matching the current search and pagination scope"
                    icon={<Users />}
                    loading={isLoading}
                />
                <StatCard
                    label="Active on page"
                    value={activeCount}
                    description="Users currently allowed to access the product"
                    icon={<Users />}
                    loading={isLoading}
                    color="success"
                />
                <StatCard
                    label="Verified on page"
                    value={verifiedCount}
                    description="Accounts with confirmed email identity"
                    icon={<Users />}
                    loading={isLoading}
                    color="secondary"
                />
            </div>

            <SectionCard
                title="User directory"
                description="Review roles, verification, and status changes from one place."
            >
                <QueryBoundary
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    errorFallback="Failed to load users."
                    onRetry={() => void refetch()}
                    loadingFallback={<div className="h-48 animate-pulse rounded-md bg-muted" />}
                    isEmpty={users.length === 0}
                    emptyFallback={
                        <EmptyState
                            icon={<Users />}
                            title="No users found"
                            description="Try broadening the search or check if the current filters are too narrow."
                        />
                    }
                >
                    <AdminUsersDirectory
                        users={users}
                        isMobile={isMobile}
                        isUpdating={statusMutation.isPending}
                        updatingUserId={statusMutation.variables?.id}
                        onStatusChange={(id, is_active) => statusMutation.mutate({ id, is_active })}
                    />
                </QueryBoundary>
                <PaginationControls
                    count={data?.total ?? 0}
                    page={page}
                    rowsPerPage={ADMIN_USERS_PAGE_SIZE}
                    onPageChange={setPage}
                />
            </SectionCard>
        </PageShell>
    );
}
