import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EventSourceFunc } from "@fullcalendar/react";
import { EventCalendar } from "@/components/event-calendar";
import { toFullCalendarEvent, toInclusiveCalendarRange } from "./calendarEventSource";

const calendarItem = {
    id: "event-1",
    source: "planner",
    type: "event",
    title: "Planning",
    description: null,
    date: "2026-07-15",
    start_time: null,
    end_time: null,
    project_id: null,
    project_name: null,
    priority: null,
    status: null,
    created_at: "2026-07-01T09:00:00Z",
} as const;

describe("calendar event source", () => {
    it("converts FullCalendar's exclusive end to the API's inclusive end", () => {
        expect(toInclusiveCalendarRange({
            startStr: "2026-07-01T00:00:00+02:00",
            endStr: "2026-08-01T00:00:00+02:00",
        })).toEqual({ start: "2026-07-01", end: "2026-07-31" });
    });

    it("keeps date-only items all-day in FullCalendar", () => {
        expect(toFullCalendarEvent(calendarItem)).toMatchObject({
            start: "2026-07-15",
            allDay: true,
            title: "Planning",
        });
    });
});

describe("calendar views", () => {
    it("switches among day, week, month, and rolling year views", async () => {
        const viewTypes: string[] = [];
        render(
            <EventCalendar
                availableViews={["timeGridDay", "timeGridWeek", "dayGridMonth", "multiMonthRollingYear"]}
                views={{
                    multiMonthRollingYear: {
                        type: "multiMonth",
                        duration: { months: 12 },
                    },
                }}
                buttons={{ multiMonthRollingYear: { text: "12M" } }}
                datesSet={({ view }) => viewTypes.push(view.type)}
            />,
        );

        const views = [
            { name: /Day view/, type: "timeGridDay" },
            { name: /Week view/, type: "timeGridWeek" },
            { name: /Month view/, type: "dayGridMonth" },
            { name: /12M/, type: "multiMonthRollingYear" },
        ];
        for (const view of views) {
            const previousCount = viewTypes.length;
            fireEvent.click(screen.getByRole("tab", { name: view.name }));
            await waitFor(() => {
                expect(viewTypes.length).toBeGreaterThan(previousCount);
                expect(viewTypes.at(-1)).toBe(view.type);
            });
        }
    });

    it("navigates the active view and emits its automatic fetch range", async () => {
        const fetchRanges: Array<{ start: string; end: string }> = [];
        render(
            <EventCalendar
                availableViews={["timeGridDay", "timeGridWeek", "dayGridMonth", "multiMonthRollingYear"]}
                views={{
                    multiMonthRollingYear: {
                        type: "multiMonth",
                        duration: { months: 12 },
                    },
                }}
                buttons={{ multiMonthRollingYear: { text: "12M" } }}
                events={(range: Parameters<EventSourceFunc>[0]) => {
                    fetchRanges.push({ start: range.startStr, end: range.endStr });
                    return [];
                }}
            />,
        );

        const views = [/Day view/, /Week view/, /Month view/, /12M/];
        for (const name of views) {
            fireEvent.click(screen.getByRole("tab", { name }));
            const rangeStart = fetchRanges.at(-1)?.start;
            fireEvent.click(screen.getByRole("button", { name: /^Next/ }));

            await waitFor(() => {
                expect(fetchRanges.at(-1)?.start).not.toBe(rangeStart);
            });
        }
    });
});
