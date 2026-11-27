import { FormField } from "@/components/ui/form-field";
import { colorMix } from "@/lib/color";
import { GripVertical as DragIcon } from "lucide-react";
import type { ProjectTask, ProjectTaskStatus } from "../../../api/projects";
import { formatDateTime } from "../../../utils/formatters";
import { TASK_STATUS_OPTIONS } from "../projectTaskModel";

function Meta({ task }: { task: ProjectTask }) { return (
    <div className="flex flex-row flex-wrap gap-1.5"><div
        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" /><div
        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />{task.assignee && <div
        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />}{task.due_date && <div
        className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />}</div>
); }

type BoardProps = { task: ProjectTask; selected: boolean; isDragging: boolean; onSelect: () => void; onDragStart: () => void; onDropBefore: () => void; onMove: (status: ProjectTaskStatus) => void };
export function TaskBoardCard({ task, selected, isDragging, onSelect, onDragStart, onDropBefore, onMove }: BoardProps) {
    return (
        <div draggable aria-grabbed={isDragging} onClick={onSelect} onDragStart={(e: any) => { e.dataTransfer.setData("text/plain", task.id); e.dataTransfer.effectAllowed = "move"; onDragStart(); }} onDragOver={(e: any) => e.preventDefault()} onDrop={(e: any) => { e.preventDefault(); e.stopPropagation(); onDropBefore(); }} style={({
            padding: 14,
            borderRadius: 12,
            cursor: "grab",
            border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
            backgroundColor: selected ? colorMix("var(--primary)", 0.12) : "var(--card)"
        })}>
            <div className="flex gap-2.5"><div className="flex flex-row gap-2 justify-between"><p>{task.title}</p><DragIcon aria-hidden="true" className="size-4 text-muted-foreground" /></div><p className="text-muted-foreground">{task.description || "No task notes yet."}</p><Meta task={task} />
                <FormField
                    as="select"
                    label="Move to"
                    value=""
                    onClick={(e: any) => e.stopPropagation()}
                    onChange={(e: any) => { e.stopPropagation(); onMove(e.target.value as ProjectTaskStatus); }}

                    aria-label={`Move ${task.title} to another column`}>{TASK_STATUS_OPTIONS.filter((o) => o.value !== task.status).map((o) => <option key={o.value}>{o.label}</option>)}</FormField>
            </div></div>
    );
}
export function TaskListCard({ task, selected, onSelect }: { task: ProjectTask; selected: boolean; onSelect: () => void }) {
    return (
        <div onClick={onSelect} style={({
            padding: 16,
            borderRadius: 16,
            cursor: "pointer",
            border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
            backgroundColor: selected ? colorMix("var(--primary)", (0.18 + 0.06) / 2) : "var(--card)"
        })}><div className="flex gap-2.5"><div className="flex flex-col md:flex-row gap-2 justify-between"><div><p>{task.title}</p><p className="text-muted-foreground">{task.description || "No task notes yet."}</p></div><span className="text-muted-foreground">Updated {formatDateTime(task.updated_at)}</span></div><Meta task={task} /></div></div>
    );
}
