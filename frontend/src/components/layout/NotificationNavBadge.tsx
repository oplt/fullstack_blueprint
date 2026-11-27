export function NotificationNavBadge({ children, unreadCount }: { children: React.ReactNode; unreadCount: number }) {
    return <span className="relative inline-flex">{children}{unreadCount > 0 ? <span aria-label={unreadCount + " unread notifications"} className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive-deep px-1 text-caption font-semibold text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}</span>;
}
