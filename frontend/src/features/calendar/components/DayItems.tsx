import { colorMix } from "@/lib/color";
import {
    CalendarCheck as AppointmentIcon,
    CalendarDays as EventIcon,
    ListChecks as TaskIcon,
} from "lucide-react";
import type { CalendarItem, CalendarItemType } from "../../../api/calendar";
import { EmptyState } from "../../../components/ui/EmptyState";
import { humanizeKey } from "../../../utils/formatters";

function ItemIcon({ type }: { type: CalendarItemType }) {
    if (type === "task") return <TaskIcon aria-hidden="true" />;
    if (type === "appointment") return <AppointmentIcon aria-hidden="true" />;
    return <EventIcon aria-hidden="true" />;
}

function ItemBadges({ item }: { item: CalendarItem }) {
    const badges = [
        item.type,
        item.project_name,
        item.status ? humanizeKey(item.status) : null,
        item.priority ? humanizeKey(item.priority) : null,
    ].filter((value): value is string => Boolean(value));

    return (
        <div className="flex flex-wrap gap-1.5">
            {badges.map((badge) => (
                <span
                    key={badge}
                    className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs"
                >
                    {badge}
                </span>
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
        return <EmptyState icon={<EventIcon />} title={emptyTitle} description={emptyDescription} />;
    }

    return (
        <div className="grid gap-2">
            {items.map((item) => (
                <article
                    key={item.id}
                    className="grid gap-2 rounded-xl border border-border p-3"
                    style={{
                        backgroundColor: item.type === "task"
                            ? colorMix("var(--success)", 0.12)
                            : "var(--card)",
                    }}
                >
                    <div className="flex items-center gap-2">
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
