import { Badge } from "@/components/ui/badge";
import {
    CalendarCheck,
    CalendarDays,
    ListChecks,
} from "lucide-react";
import type { CalendarItem, CalendarItemType } from "./api";
import { EmptyState } from "../../components/Feedback";
import { humanizeKey } from "@/lib/formatters";

function ItemIcon({ type }: { type: CalendarItemType }) {
    if (type === "task") return <ListChecks aria-hidden="true" />;
    if (type === "appointment") return <CalendarCheck aria-hidden="true" />;
    return <CalendarDays aria-hidden="true" />;
}

function ItemBadges({ item }: { item: CalendarItem }) {
    const badges = [
        item.type,
        item.project_name,
        item.status ? humanizeKey(item.status) : null,
        item.priority ? humanizeKey(item.priority) : null,
    ].filter((value): value is string => Boolean(value));

    return (
        <div className="flex flex-wrap gap-ui-xxs.5">
            {badges.map((badge) => (
                <Badge key={badge} variant="outline">
                    {badge}
                </Badge>
            ))}
        </div>
    );
}

export function DayItems({
    items,
    emptyTitle,
    emptyDescription,
}: {
    items: CalendarItem[];
    emptyTitle: string;
    emptyDescription: string;
}) {
    if (items.length === 0) {
        return <EmptyState icon={<CalendarDays />} title={emptyTitle} description={emptyDescription} />;
    }

    return (
        <div className="grid gap-ui-xs">
            {items.map((item) => (
                <article
                    key={item.id}
                    className={`grid gap-ui-xs rounded-xl border border-border p-ui-sm ${item.type === "task" ? "bg-success-soft" : "bg-card"}`}
                >
                    <div className="flex items-center gap-ui-xs">
                        <ItemIcon type={item.type} />
                        <h3>{item.title}</h3>
                    </div>
                    <ItemBadges item={item} />
                    {item.description ? (
                        <p className="text-muted-foreground">{item.description}</p>
                    ) : null}
                </article>
            ))}
        </div>
    );
}
