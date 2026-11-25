import { Bell, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { getInitials } from "../../utils/formatters";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { NotificationNavBadge } from "./NotificationNavBadge";

export function NotificationMenu() {
    const { data: notifications } = useNotifications();
    const { t } = useTranslation();
    const unread = notifications?.filter(item => !item.is_read).length ?? 0;
    return <Popover>
        <PopoverTrigger className="rounded-md p-2 hover:bg-muted" aria-label={t("navigation.openNotificationCenter")}>
            <NotificationNavBadge unreadCount={unread}><Bell size={18} /></NotificationNavBadge>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-4">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t("navigation.notifications")}</h2>
                <span className="text-xs text-muted-foreground">{t("status.unread", { count: unread })}</span>
            </div>
            <p className="py-4 text-sm text-muted-foreground">{t(notifications?.length ? "status.reviewNotifications" : "status.allCaughtUp")}</p>
            <Link to={ROUTES.notifications} className="text-sm font-medium text-primary hover:underline">{t("navigation.openNotificationCenter")}</Link>
        </PopoverContent>
    </Popover>;
}

export function ProfileMenu({ signOut }: { signOut: () => void }) {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    return <Popover>
        <PopoverTrigger className="rounded-md p-2 hover:bg-muted" aria-label={t("navigation.openProfileMenu")}>
            <Avatar size="sm"><AvatarFallback>{getInitials(currentUser?.full_name, currentUser?.email)}</AvatarFallback></Avatar>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-3">
            <p className="font-medium">{currentUser?.full_name ?? t("status.yourProfile")}</p>
            <p className="mb-3 truncate text-xs text-muted-foreground">{currentUser?.email ?? t("status.signedIn")}</p>
            <Link to={ROUTES.profile} className="block rounded-md px-3 py-2 text-sm hover:bg-muted">{t("navigation.profile")}</Link>
            <button type="button" onClick={signOut} className="mt-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-muted">
                <LogOut aria-hidden size={15} className="mr-2" />{t("actions.signOut")}
            </button>
        </PopoverContent>
    </Popover>;
}
