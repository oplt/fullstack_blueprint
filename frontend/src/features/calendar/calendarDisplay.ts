import { colorMix } from "@/lib/color";
import type { CSSProperties } from "react";
import type { CalendarItem, CalendarItemType } from "../../api/calendar";
import type { Project, ProjectTaskPriority } from "../../api/projects";
import type { CalendarViewMode } from "./calendarRange";
import { i18nInstance } from "../../i18n/config";
export type DashboardCalendarProps = {
    projects: Project[];
    projectsLoading: boolean;
    onOpenProjects: () => void;
    allowedViews?: CalendarViewMode[];
    initialView?: CalendarViewMode;
    sx?: CSSProperties;
    contentSx?: CSSProperties;
};
export type CalendarDraft = { type: CalendarItemType; title: string; description: string; start_time: string; end_time: string; project_id: string; priority: ProjectTaskPriority };
export type CalendarFieldErrors = { title?: string; project_id?: string; start_time?: string; end_time?: string; general?: string };
export const VIEW_OPTIONS: Array<{ value: CalendarViewMode; label: string }> = [{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }, { value: "twelve_month", label: "12M" }];
export const ITEM_TYPE_OPTIONS: Array<{ value: CalendarItemType; label: string }> = [{ value: "event", label: "Event" }, { value: "appointment", label: "Appointment" }, { value: "task", label: "Task" }];
export function buildEmptyDraft(projects: Project[], type: CalendarItemType = "event"): CalendarDraft { return { type, title: "", description: "", start_time: "", end_time: "", project_id: projects[0]?.id ?? "", priority: "medium" }; }
export function formatTimeValue(value: string) { return new Intl.DateTimeFormat(i18nInstance.resolvedLanguage ?? "en", { hour: "numeric", minute: "2-digit" }).format(new Date(`1970-01-01T${value}`)); }
export function formatItemTime(item: CalendarItem) { if (!item.start_time) return item.type === "task" ? "Due anytime" : "All day"; return item.end_time ? `${formatTimeValue(item.start_time)} to ${formatTimeValue(item.end_time)}` : formatTimeValue(item.start_time); }
export function getMinutesFromTimeString(value: string) { const [hours = "0", minutes = "0"] = value.split(":"); return Number(hours) * 60 + Number(minutes); }
export function getWeekItemColor(item: CalendarItem) { const color = item.type === "task" ? "var(--success)" : item.type === "appointment" ? "var(--warning)" : "var(--primary)"; return { bg: colorMix(color, .14), border: colorMix(color, .4), text: color }; }
export function getDateCalendarStyle(daySize: number) { return { width: "100%", maxWidth: "none", margin: 0, "--calendar-day-size": `${daySize}px` } as const; }

