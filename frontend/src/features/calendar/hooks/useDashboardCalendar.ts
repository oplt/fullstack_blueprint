import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventSourceFunc } from "@fullcalendar/react";
import { createCalendarItem, listCalendarItems } from "@/api/calendar";
import { queryKeys } from "@/config/queryKeys";
import { QUERY_STALE_TIMES } from "@/config/queryTiming";
import { notify } from "@/lib/notify";
import { humanizeKey } from "@/utils/formatters";
import { toFullCalendarEvent, toInclusiveCalendarRange } from "../calendarEventSource";
import {
    buildEmptyDraft,
    getCalendarDraftErrors,
    type CalendarDraft,
    type CalendarFieldErrors,
    type DashboardCalendarProps,
} from "../calendarDisplay";

export function useDashboardCalendar({
    projects,
    projectsLoading,
    projectsEnabled,
    onOpenProjects,
    allowedViews = ["month"],
    initialView = "month",
}: DashboardCalendarProps) {
    const client = useQueryClient();
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [draft, setDraft] = useState<CalendarDraft>(() => buildEmptyDraft(projects));
    const [fieldErrors, setFieldErrors] = useState<CalendarFieldErrors>({});
    const [eventsRevision, setEventsRevision] = useState(0);
    const [calendarError, setCalendarError] = useState<unknown>(null);

    const events = useCallback(async ({ startStr, endStr }: Parameters<EventSourceFunc>[0]) => {
        const { start, end } = toInclusiveCalendarRange({ startStr, endStr });
        try {
            const items = await client.fetchQuery({
                queryKey: queryKeys.calendar.items(start, end),
                queryFn: ({ signal }) => listCalendarItems(start, end, { signal }),
                staleTime: QUERY_STALE_TIMES.calendar,
            });
            setCalendarError(null);
            return items.map(toFullCalendarEvent);
        } catch (error) {
            setCalendarError(error);
            throw error;
        }
    }, [client]);

    const selectedItemsQuery = useQuery({
        queryKey: queryKeys.calendar.items(selectedDateKey ?? "", selectedDateKey ?? ""),
        queryFn: ({ signal }) => listCalendarItems(selectedDateKey!, selectedDateKey!, { signal }),
        enabled: selectedDateKey !== null,
        staleTime: QUERY_STALE_TIMES.calendar,
    });

    const createItemMutation = useMutation({
        mutationFn: () => createCalendarItem({
            type: draft.type,
            title: draft.title.trim(),
            description: draft.description.trim() || null,
            date: selectedDateKey ?? "",
            start_time: draft.type === "task" ? null : draft.start_time || null,
            end_time: draft.type === "task" ? null : draft.end_time || null,
            project_id: draft.type === "task" ? draft.project_id || null : null,
            priority: draft.type === "task" ? draft.priority : null,
        }),
        onSuccess: async (item) => {
            await client.invalidateQueries({ queryKey: queryKeys.calendar.all });
            setCalendarError(null);
            setEventsRevision((revision) => revision + 1);
            if (item.type === "task") {
                await client.invalidateQueries({ queryKey: queryKeys.projects.all });
            }
            setDraft(buildEmptyDraft(projects, draft.type));
            setFieldErrors({});
            const message = item.type === "task"
                ? "Task scheduled on the calendar."
                : `${humanizeKey(item.type)} saved.`;
            notify({ message, severity: "success" });
        },
        onError: (error) => setFieldErrors({
            general: error instanceof Error ? error.message : "Failed to save calendar item.",
        }),
    });

    function openDay(dateKey: string) {
        setSelectedDateKey(dateKey.slice(0, 10));
        setDrawerOpen(true);
        setFieldErrors({});
        setDraft((current) => ({
            ...current,
            project_id: current.project_id || projects[0]?.id || "",
        }));
    }

    function submitDraft() {
        const errors = getCalendarDraftErrors(draft, selectedDateKey);
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        createItemMutation.mutate();
    }

    return {
        projects,
        projectsLoading,
        projectsEnabled,
        onOpenProjects,
        allowedViews,
        initialView,
        selectedDateKey,
        drawerOpen,
        setDrawerOpen,
        draft,
        setDraft,
        fieldErrors,
        setFieldErrors,
        selectedItemsQuery,
        calendarError,
        retryCalendar: () => setEventsRevision((revision) => revision + 1),
        createItemMutation,
        events,
        eventsRevision,
        openDay,
        submitDraft,
    };
}

export type DashboardCalendarModel = ReturnType<typeof useDashboardCalendar>;
