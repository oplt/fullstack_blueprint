export function NotificationNavBadge({ children, unreadCount }: { children: React.ReactNode; unreadCount: number }) {
    return <span className="relative inline-flex">{children}{unreadCount > 0 ? <span aria-label={unreadCount + " unread notifications"} className="absolute grid ui-auto-notification-nav-badge-span">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}</span>;
}
