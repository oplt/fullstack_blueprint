import { formatDateOnly } from "../../../utils/formatters";
import { DayItems } from "./DayItems";
import { CalendarItemForm } from "./CalendarItemForm";
import type { DashboardCalendarModel } from "../hooks/useDashboardCalendar";

export function CalendarItemDrawer({ m }: { m: DashboardCalendarModel }) {
    const items = m.selectedDateKey ? m.itemsByDate[m.selectedDateKey] ?? [] : [];
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="font-semibold">
                    {m.selectedDateKey ? formatDateOnly(m.selectedDateKey) : "Select a day"}
                </h2>
                <p className="text-muted-foreground">
                    Add an event, appointment, or a real task due on this day.
                </p>
            </div>
            <section aria-label="Day agenda">
                <h3 className="mb-2 font-medium">Day agenda</h3>
                <DayItems
                    items={items}
                    emptyTitle="Nothing scheduled yet"
                    emptyDescription="Pick a type below and add the first calendar item for this day."
                />
            </section>
            <CalendarItemForm model={m} />
        </div>
    );
}
