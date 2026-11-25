import { Button } from "@/components/ui/button";
import type { CalendarItem } from "../../../api/calendar";
import { formatDateOnly, humanizeKey } from "../../../utils/formatters";
import { formatItemTime } from "../calendarDisplay";
import { DayItems } from "./DayItems";

type Props = {
    item: CalendarItem | null;
    items: CalendarItem[];
    dayKey: string;
    onEdit: () => void;
};

export function CalendarDaySummary({ item, items, dayKey, onEdit }: Props) {
    return (
        <div className="p-4">
            {item ? (
                <div className="grid gap-4">
                    <div>
                        <h3>{item.title}</h3>
                        <p className="mt-1 text-muted-foreground">
                            {item.description || "No extra notes for this item."}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <p className="text-muted-foreground">{formatDateOnly(dayKey)}</p>
                        <p className="text-muted-foreground">{formatItemTime(item)}</p>
                        {item.project_name ? (
                            <p className="text-muted-foreground">Project: {item.project_name}</p>
                        ) : null}
                        {item.priority ? (
                            <p className="text-muted-foreground">Priority: {humanizeKey(item.priority)}</p>
                        ) : null}
                    </div>
                    <Button variant="outline" onClick={onEdit} type="button">
                        Edit or add item
                    </Button>
                </div>
            ) : (
                <DayItems
                    items={items}
                    emptyTitle="Nothing scheduled for this day"
                    emptyDescription="Use Add item to create an event, appointment, or task."
                />
            )}
        </div>
    );
}
