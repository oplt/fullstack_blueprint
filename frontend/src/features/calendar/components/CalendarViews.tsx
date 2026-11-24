import { colorMix } from "@/lib/color";import { getMonthGridColumns } from "../calendarRange";
import type { DashboardCalendarModel } from "../hooks/useDashboardCalendar";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarWeekView } from "./CalendarWeekView";
import { MonthDateCalendar } from "./MonthDateCalendar";

function CalendarMonthViews({ m }: { m: DashboardCalendarModel }) {
    return (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: getMonthGridColumns(m.viewMode) }}>
            {m.visibleMonths.map((month) => <div key={month.format("YYYY-MM")} style={({
                borderRadius: 16,
                border: `1px solid ${"var(--border)"}`,
                padding: 10,
                backgroundColor: colorMix("var(--card)", (0.9 + 0.78) / 2)
            })}><MonthDateCalendar m={m} date={month} /></div>)}
        </div>
    );
}

export function CalendarViews({ m }: { m: DashboardCalendarModel }) {
    if (m.viewMode === "day") return <CalendarDayView m={m} />;
    if (m.viewMode === "week") return <CalendarWeekView m={m} />;
    return <CalendarMonthViews m={m} />;
}
