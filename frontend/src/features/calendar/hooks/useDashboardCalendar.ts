import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCalendarItem, listCalendarItems, type CalendarItem } from "../../../api/calendar";
import { queryKeys } from "../../../config/queryKeys";
import { QUERY_STALE_TIMES } from "../../../config/queryTiming";
import { notify } from "../../../lib/notify";
import { humanizeKey } from "../../../utils/formatters";
import { getCalendarQueryRange, type CalendarViewMode } from "../calendarRange";
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
    const [viewMode, setViewMode] = useState<CalendarViewMode>(initialView);
    const [anchorDate, setAnchorDate] = useState(dayjs().startOf("day"));
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [draft, setDraft] = useState<CalendarDraft>(() => buildEmptyDraft(projects));
    const [fieldErrors, setFieldErrors] = useState<CalendarFieldErrors>({});

    const { start, end } = getCalendarQueryRange(viewMode, anchorDate);
    const selectedDate = selectedDateKey ? dayjs(selectedDateKey) : anchorDate;
    const visibleMonths = viewMode === "twelve_month"
        ? Array.from({ length: 12 }, (_, index) => anchorDate.startOf("month").add(index, "month"))
        : [anchorDate.startOf("month")];
    const daySize = viewMode === "twelve_month" ? 34 : 40;

    const itemsQuery = useQuery({
        queryKey: queryKeys.calendar.items(start, end),
        queryFn: ({ signal }) => listCalendarItems(start, end, { signal }),
        staleTime: QUERY_STALE_TIMES.calendar,
    });
    const itemsByDate = (itemsQuery.data ?? []).reduce<Record<string, CalendarItem[]>>(
        (itemsByDay, item) => {
            itemsByDay[item.date] = [...(itemsByDay[item.date] ?? []), item];
            return itemsByDay;
        },
        {}
    );

    const createItemMutation = useMutation({
        mutationFn: () => createCalendarItem({
            type: draft.type,
            title: draft.title.trim(),
            description: draft.description.trim() || null,
            date: selectedDateKey ?? anchorDate.format("YYYY-MM-DD"),
            start_time: draft.type === "task" ? null : draft.start_time || null,
            end_time: draft.type === "task" ? null : draft.end_time || null,
            project_id: draft.type === "task" ? draft.project_id || null : null,
            priority: draft.type === "task" ? draft.priority : null,
        }),
        onSuccess: async (item) => {
            await client.invalidateQueries({ queryKey: queryKeys.calendar.all });
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

    function openDay(value: Dayjs | string) {
        const date = typeof value === "string" ? dayjs(value) : value.startOf("day");
        setSelectedDateKey(date.format("YYYY-MM-DD"));
        setAnchorDate(date);
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
        viewMode,
        setViewMode,
        anchorDate,
        setAnchorDate,
        selectedDateKey,
        setSelectedDateKey,
        drawerOpen,
        setDrawerOpen,
        draft,
        setDraft,
        fieldErrors,
        setFieldErrors,
        selectedDate,
        visibleMonths,
        daySize,
        itemsQuery,
        itemsByDate,
        createItemMutation,
        openDay,
        submitDraft,
    };
}

export type DashboardCalendarModel = ReturnType<typeof useDashboardCalendar>;
