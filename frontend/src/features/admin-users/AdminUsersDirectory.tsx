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
        <div className="flex flex-wrap gap-2">
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
        <article className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-medium">{user.full_name ?? "Unnamed user"}</p>
                    <p className="break-all text-muted-foreground">{user.email}</p>
                </div>
                <UserStatusSwitch user={user} disabled={disabled} onChange={onStatusChange} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <UserBadges user={user} />
                <span className="text-sm text-muted-foreground">
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
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border">
                        <th scope="col" className="p-2 text-left">Email</th>
                        <th scope="col" className="p-2 text-left">Name</th>
                        <th scope="col" className="p-2 text-left">Roles</th>
                        <th scope="col" className="p-2 text-left">Verified</th>
                        <th scope="col" className="p-2 text-left">Joined</th>
                        <th scope="col" className="p-2 text-center">Active</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} className="border-b border-border">
                            <td className="p-2">{user.email}</td>
                            <td className="p-2">{user.full_name ?? "—"}</td>
                            <td className="p-2"><UserBadges user={user} /></td>
                            <td className="p-2">{user.is_verified ? "Verified" : "Unverified"}</td>
                            <td className="p-2">{formatDate(user.created_at)}</td>
                            <td className="p-2 text-center">
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
            <div className="grid gap-3">
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
