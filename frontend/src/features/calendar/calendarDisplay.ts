import { colorMix } from "@/lib/color";
import type { CalendarItem, CalendarItemType } from "../../api/calendar";
import type { Project, ProjectTaskPriority } from "../../api/projects";
import { i18nInstance } from "../../i18n/config";
import type { CalendarViewMode } from "./calendarRange";

export type DashboardCalendarProps = {
    projects: Project[];
    projectsLoading: boolean;
    projectsEnabled: boolean;
    onOpenProjects?: () => void;
    allowedViews?: CalendarViewMode[];
    initialView?: CalendarViewMode;
    className?: string;
    contentClassName?: string;
};

export type CalendarDraft = {
    type: CalendarItemType;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    project_id: string;
    priority: ProjectTaskPriority;
};

export type CalendarFieldErrors = {
    title?: string;
    project_id?: string;
    start_time?: string;
    end_time?: string;
    general?: string;
};

export const VIEW_OPTIONS: Array<{ value: CalendarViewMode; label: string }> = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "twelve_month", label: "12M" },
];

export const ITEM_TYPE_OPTIONS: Array<{ value: CalendarItemType; label: string }> = [
    { value: "event", label: "Event" },
    { value: "appointment", label: "Appointment" },
    { value: "task", label: "Task" },
];

export function buildEmptyDraft(
    projects: Project[],
    type: CalendarItemType = "event"
): CalendarDraft {
    return {
        type,
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        project_id: projects[0]?.id ?? "",
        priority: "medium",
    };
}

export function getCalendarDraftErrors(
    draft: CalendarDraft,
    selectedDateKey: string | null
): CalendarFieldErrors {
    return {
        ...dateErrors(selectedDateKey),
        ...titleErrors(draft),
        ...projectErrors(draft),
        ...timeErrors(draft),
    };
}

function dateErrors(selectedDateKey: string | null): CalendarFieldErrors {
    return selectedDateKey
        ? {}
        : { general: "Choose a day before adding a calendar item." };
}

function titleErrors(draft: CalendarDraft): CalendarFieldErrors {
    return draft.title.trim().length >= 2
        ? {}
        : { title: "Title must be at least 2 characters." };
}

function projectErrors(draft: CalendarDraft): CalendarFieldErrors {
    return draft.type === "task" && !draft.project_id
        ? { project_id: "Select a project for this task." }
        : {};
}

function timeErrors(draft: CalendarDraft): CalendarFieldErrors {
    if (draft.type === "task") return {};
    if (draft.end_time && !draft.start_time) {
        return { start_time: "Start time is required when end time is set." };
    }
    if (draft.start_time && draft.end_time && draft.end_time <= draft.start_time) {
        return { end_time: "End time must be after start time." };
    }
    return {};
}

export function formatTimeValue(value: string) {
    return new Intl.DateTimeFormat(i18nInstance.resolvedLanguage ?? "en", {
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(`1970-01-01T${value}`));
}

export function formatItemTime(item: CalendarItem) {
    if (!item.start_time) return item.type === "task" ? "Due anytime" : "All day";
    if (item.end_time) {
        return `${formatTimeValue(item.start_time)} to ${formatTimeValue(item.end_time)}`;
    }
    return formatTimeValue(item.start_time);
}

export function getMinutesFromTimeString(value: string) {
    const [hours = "0", minutes = "0"] = value.split(":");
    return Number(hours) * 60 + Number(minutes);
}

export function getCalendarEventLayout(
    startMinutes: number,
    endMinutes: number,
    gridStartMinutes: number,
    rowHeight: number,
    minimumHeight: number
) {
    return {
        top: ((startMinutes - gridStartMinutes) / 60) * rowHeight,
        height: Math.max(((endMinutes - startMinutes) / 60) * rowHeight, minimumHeight),
    };
}

export function getWeekItemColor(item: CalendarItem) {
    const color = item.type === "task"
        ? "var(--success)"
        : item.type === "appointment"
            ? "var(--warning)"
            : "var(--primary)";
    return { bg: colorMix(color, 0.14), border: colorMix(color, 0.4), text: color };
}
