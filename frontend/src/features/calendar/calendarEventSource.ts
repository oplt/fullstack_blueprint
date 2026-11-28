import type { EventInput } from "@fullcalendar/react";
import type { CalendarItem } from "./api";

export type CalendarFetchRange = {
    startStr: string;
    endStr: string;
};

export function toInclusiveCalendarRange({ startStr, endStr }: CalendarFetchRange) {
    return {
        start: startStr.slice(0, 10),
        end: previousPlainDate(endStr.slice(0, 10)),
    };
}

function previousPlainDate(isoDate: string): string {
    const [year, month, day] = isoDate.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function toFullCalendarEvent(item: CalendarItem): EventInput {
    const color = item.type === "task"
        ? "var(--success)"
        : item.type === "appointment"
            ? "var(--warning)"
            : "var(--primary)";

    return {
        id: `${item.source}:${item.id}`,
        title: item.title,
        start: item.start_time ? `${item.date}T${item.start_time}` : item.date,
        ...(item.end_time ? { end: `${item.date}T${item.end_time}` } : {}),
        allDay: !item.start_time,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { calendarItem: item },
    };
}
