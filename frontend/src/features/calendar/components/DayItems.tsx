import { colorMix } from "@/lib/color";import { CalendarDays as EventIcon, CalendarCheck as AppointmentIcon, ListChecks as TaskIcon } from "lucide-react";
import type { CalendarItem, CalendarItemType } from "../../../api/calendar";
import { EmptyState } from "../../../components/ui/EmptyState";
function getItemIcon(type: CalendarItemType) { if (type === "task") return <TaskIcon fontSize="small" />; if (type === "appointment") return <AppointmentIcon fontSize="small" />; return <EventIcon fontSize="small" />; }
export function DayItems({ items, emptyTitle, emptyDescription }: { items: CalendarItem[]; emptyTitle: string; emptyDescription: string }) { if (!items.length) return <EmptyState icon={<EventIcon />} title={emptyTitle} description={emptyDescription} />; return (
  <div className="flex gap-[8px]">{items.map((item) => <div key={item.id} style={({
    borderRadius: 12,
    border: `1px solid ${"var(--border)"}`,
    padding: 12,
    backgroundColor: item.type === "task" ? colorMix("var(--success)", 0.12) : "var(--card)"
  })}><div className="flex gap-[6px]"><div className="flex flex-row gap-[8px] items-center">{getItemIcon(item.type)}<p>{item.title}</p></div><div className="flex flex-row gap-[6px] flex-wrap"><div
    className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" /><div
    className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />{item.project_name && <div
    className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />}{item.status && <div
    className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />}{item.priority && <div
    className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />}</div>{item.description && <p className="text-muted-foreground">{item.description}</p>}</div></div>)}</div>
); }
