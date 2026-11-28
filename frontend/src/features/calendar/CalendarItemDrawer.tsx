import { formatDateOnly } from "@/lib/formatters";
import { DayItems } from "./DayItems";
import { CalendarItemForm } from "./CalendarItemForm";
import { QueryErrorAlert } from "@/components/ui/QueryBoundary";
import type { DashboardCalendarModel } from "./useDashboardCalendar";

export function CalendarItemDrawer({ m }: { m: DashboardCalendarModel }) {
    const items = m.selectedItemsQuery.data ?? [];
    return (
        <div className="flex flex-col gap-ui-md">
            <div>
                <h2 className="font-semibold">
                    {m.selectedDateKey ? formatDateOnly(m.selectedDateKey) : "Select a day"}
                </h2>
                <p className="text-muted-foreground">
                    Add an event, appointment, or a real task due on this day.
                </p>
            </div>
            <section aria-label="Day agenda">
                <h3 className="mb-ui-xs font-medium">Day agenda</h3>
                {m.selectedItemsQuery.isError ? (
                    <QueryErrorAlert
                        error={m.selectedItemsQuery.error}
                        fallback="Failed to load calendar items."
                        onRetry={() => void m.selectedItemsQuery.refetch()}
                    />
                ) : m.selectedItemsQuery.isLoading ? (
                    <p role="status" className="text-body-md text-muted-foreground">Loading agenda…</p>
                ) : (
                    <DayItems
                        items={items}
                        emptyTitle="Nothing scheduled yet"
                        emptyDescription="Pick a type below and add the first calendar item for this day."
                    />
                )}
            </section>
            <CalendarItemForm model={m} />
        </div>
    );
}
