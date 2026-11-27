import { Bell, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ROUTES } from "@/config/routes";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { getInitials } from "../../utils/formatters";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { NotificationNavBadge } from "./NotificationNavBadge";

export function NotificationMenu() {
    const { data: notifications } = useNotifications();
    const { t } = useTranslation();
    const unread = notifications?.filter(item => !item.is_read).length ?? 0;
    return <Popover>
        <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("navigation.openNotificationCenter")} />}>
            <NotificationNavBadge unreadCount={unread}><Bell size={18} /></NotificationNavBadge>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-ui-md">
            <div className="flex items-center justify-between">
                <h2 className="font-semibold">{t("navigation.notifications")}</h2>
                <span className="text-body-sm text-muted-foreground">{t("status.unread", { count: unread })}</span>
            </div>
            <p className="py-ui-md text-body-md text-muted-foreground">{t(notifications?.length ? "status.reviewNotifications" : "status.allCaughtUp")}</p>
            <Link to={ROUTES.notifications} className="text-body-md font-medium text-primary hover:underline">{t("navigation.openNotificationCenter")}</Link>
        </PopoverContent>
    </Popover>;
}

export function ProfileMenu({ signOut }: { signOut: () => void }) {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    return <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("navigation.openProfileMenu")} />}>
            <Avatar size="sm"><AvatarFallback>{getInitials(currentUser?.full_name, currentUser?.email)}</AvatarFallback></Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-ui-xs">
            <p className="font-medium">{currentUser?.full_name ?? t("status.yourProfile")}</p>
            <p className="mb-ui-xs truncate px-ui-xs text-body-sm text-muted-foreground">{currentUser?.email ?? t("status.signedIn")}</p>
            <DropdownMenuItem render={<Link to={ROUTES.profile} />}>{t("navigation.profile")}</DropdownMenuItem>
            <DropdownMenuItem onClick={signOut} className="gap-ui-xs">
                <LogOut aria-hidden size={15} />{t("actions.signOut")}
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>;
}
