import type { CalendarItemType } from "./api";
import type { Project, ProjectTaskPriority } from "@/features/projects/api";

export type CalendarViewMode = "day" | "week" | "month" | "twelve_month";

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
