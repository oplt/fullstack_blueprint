import dayjs, { type Dayjs } from "dayjs";
import { Calendar, CalendarDayButton } from "../../../components/ui/calendar";
import type { DayButton } from "react-day-picker";
import type { DashboardCalendarModel } from "../hooks/useDashboardCalendar";

export function MonthDateCalendar({ m, date }: { m: DashboardCalendarModel; date: Dayjs }) {
    const { itemsByDate, openDay, daySize, selectedDate, setAnchorDate } = m;
    const selected = selectedDate.isSame(date, "month") ? selectedDate.toDate() : undefined;
    const DayWithItems = (props: React.ComponentProps<typeof DayButton>) => {
        const key = dayjs(props.day.date).format("YYYY-MM-DD");
        const itemTypes = (itemsByDate[key] ?? []).map((item) => item.type);
        return (
            <span className="relative block">
                <CalendarDayButton
                    {...props}
                    className="font-bold"
                    style={{ width: daySize, height: daySize }}
                    onClick={(event) => {
                        props.onClick?.(event);
                        openDay(dayjs(props.day.date));
                    }}
                />
                {itemTypes.length > 0 ? (
                    <span className="pointer-events-none absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden="true">
                        {itemTypes.slice(0, 3).map((itemType, index) => <span key={`${itemType}-${index}`} className={`size-1 rounded-full ${itemType === "task" ? "bg-success" : itemType === "appointment" ? "bg-warning" : "bg-primary"}`} />)}
                    </span>
                ) : null}
            </span>
        );
    };

    return (
        <Calendar
            mode="single"
            month={date.toDate()}
            selected={selected}
            onSelect={(value) => {
                if (value) setAnchorDate(dayjs(value).startOf("day"));
            }}
            showOutsideDays
            fixedWeeks
            className="w-full"
            components={{ DayButton: DayWithItems }}
        />
    );
}
