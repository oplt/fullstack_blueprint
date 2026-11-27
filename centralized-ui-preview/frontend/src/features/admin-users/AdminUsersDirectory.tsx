import type { AdminUser } from "../../api/admin";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { formatDate } from "../../utils/formatters";

type AdminUsersDirectoryProps = {
    users: AdminUser[];
    isMobile: boolean;
    isUpdating: boolean;
    updatingUserId?: string;
    onStatusChange: (userId: string, isActive: boolean) => void;
};

function UserStatusSwitch({
    user,
    disabled,
    onChange,
}: {
    user: AdminUser;
    disabled: boolean;
    onChange: (isActive: boolean) => void;
}) {
    const action = user.is_active ? "Deactivate" : "Activate";
    return (
        <Switch
            checked={user.is_active}
            disabled={disabled}
            onCheckedChange={onChange}
            aria-label={`${action} ${user.full_name ?? user.email}`}
        />
    );
}

function UserBadges({ user }: { user: AdminUser }) {
    return (
        <div className="flex flex-wrap gap-ui-xs">
            {user.roles.map((role) => (
                <Badge key={role} variant="outline">{role}</Badge>
            ))}
            <Badge variant={user.is_verified ? "success" : "secondary"}>
                {user.is_verified ? "Verified" : "Unverified"}
            </Badge>
        </div>
    );
}

function MobileUserCard({
    user,
    disabled,
    onStatusChange,
}: {
    user: AdminUser;
    disabled: boolean;
    onStatusChange: (isActive: boolean) => void;
}) {
    return (
        <article className="ui-auto-admin-users-directory-mobile-user-card-article">
            <div className="flex items-start justify-between gap-ui-sm">
                <div className="min-w-0">
                    <p className="ui-auto-admin-users-directory-mobile-user-card-p">{user.full_name ?? "Unnamed user"}</p>
                    <p className="break-all text-muted-foreground">{user.email}</p>
                </div>
                <UserStatusSwitch user={user} disabled={disabled} onChange={onStatusChange} />
            </div>
            <div className="flex flex-wrap items-center justify-between ui-auto-admin-users-directory-mobile-user-card-div">
                <UserBadges user={user} />
                <span className="ui-auto-admin-users-directory-mobile-user-card-span">
                    Joined {formatDate(user.created_at)}
                </span>
            </div>
        </article>
    );
}

function UserTable({
    users,
    isUpdating,
    updatingUserId,
    onStatusChange,
}: Omit<AdminUsersDirectoryProps, "isMobile">) {
    return (
        <div className="overflow-auto">
            <table className="w-full ui-auto-admin-users-directory-user-table-table">
                <thead>
                    <tr className="ui-auto-admin-users-directory-user-table-tr">
                        <th scope="col" className="ui-auto-admin-users-directory-user-table-th">Email</th>
                        <th scope="col" className="ui-auto-admin-users-directory-user-table-th-038878e">Name</th>
                        <th scope="col" className="ui-auto-admin-users-directory-user-table-th-038878e-x">Roles</th>
                        <th scope="col" className="ui-auto-admin-users-directory-user-table-th-038878e-x-x">Verified</th>
                        <th scope="col" className="ui-auto-admin-users-directory-user-table-th-038878e-x-x-x">Joined</th>
                        <th scope="col" className="ui-auto-admin-users-directory-user-table-th-7a2f25f">Active</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} className="ui-auto-admin-users-directory-user-table-tr-6ff2f8b">
                            <td className="p-ui-xs">{user.email}</td>
                            <td className="p-ui-xs">{user.full_name ?? "—"}</td>
                            <td className="p-ui-xs"><UserBadges user={user} /></td>
                            <td className="p-ui-xs">{user.is_verified ? "Verified" : "Unverified"}</td>
                            <td className="p-ui-xs">{formatDate(user.created_at)}</td>
                            <td className="ui-auto-admin-users-directory-user-table-td">
                                <UserStatusSwitch
                                    user={user}
                                    disabled={isUpdating && updatingUserId === user.id}
                                    onChange={(isActive) => onStatusChange(user.id, isActive)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function AdminUsersDirectory(props: AdminUsersDirectoryProps) {
    if (props.isMobile) {
        return (
            <div className="grid gap-ui-sm">
                {props.users.map((user) => (
                    <MobileUserCard
                        key={user.id}
                        user={user}
                        disabled={props.isUpdating && props.updatingUserId === user.id}
                        onStatusChange={(isActive) => props.onStatusChange(user.id, isActive)}
                    />
                ))}
            </div>
        );
    }
    return <UserTable {...props} />;
}
