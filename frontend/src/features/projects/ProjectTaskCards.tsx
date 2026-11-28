import type { ChangeEvent, MouseEvent } from "react";
import { FormField } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import type { ProjectTask, ProjectTaskStatus } from "@/features/projects/api";
import { formatDateTime } from "@/lib/formatters";
import { TASK_STATUS_OPTIONS } from "./projectTaskModel";
function Meta({ task }: { task: ProjectTask }) {
    return <div className="ui-task-meta"><Badge variant="outline">{TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label ?? task.status}</Badge><Badge variant="outline">{task.priority}</Badge>{task.assignee && <Badge variant="outline">{task.assignee.full_name ?? task.assignee.email}</Badge>}{task.due_date && <Badge variant="outline">Due {formatDateTime(task.due_date)}</Badge>}</div>;
}
type BoardProps = { task: ProjectTask; selected: boolean; isDragging: boolean; onSelect: () => void; onDragStart: () => void; onDropBefore: () => void; onMove: (status: ProjectTaskStatus) => void };
export function TaskBoardCard({ task, selected, isDragging, onSelect, onDragStart, onDropBefore, onMove }: BoardProps) {
    return <Card size="sm" className="ui-task-card" data-selected={selected} data-dragging={isDragging} draggable onClick={onSelect}
        onDragStart={(event) => { event.dataTransfer.setData("text/plain", task.id); event.dataTransfer.effectAllowed = "move"; onDragStart(); }}
        onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); onDropBefore(); }}>
        <CardContent className="ui-task-content"><div className="flex items-center justify-between gap-ui-xs"><Button variant="link" className="ui-task-title" onClick={(event) => { event.stopPropagation(); onSelect(); }} type="button">{task.title}</Button><GripVertical aria-hidden="true" className="size-(--icon-size-md) text-muted-foreground" /></div><p className="text-body-md text-muted-foreground">{task.description || "No task notes yet."}</p><Meta task={task} />
            <FormField as="select" label="Move to" value="" onClick={(event: MouseEvent<HTMLSelectElement>) => event.stopPropagation()} onChange={(event: ChangeEvent<HTMLSelectElement>) => { event.stopPropagation(); if (event.target.value) onMove(event.target.value as ProjectTaskStatus); }} aria-label={`Move ${task.title} to another column`}><option value="" disabled>Select status</option>{TASK_STATUS_OPTIONS.filter((option) => option.value !== task.status).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</FormField>
        </CardContent>
    </Card>;
}
export function TaskListCard({ task, selected, onSelect }: { task: ProjectTask; selected: boolean; onSelect: () => void }) {
    return <Card size="sm" className="ui-task-card cursor-pointer" data-selected={selected} onClick={onSelect}><CardContent className="ui-task-content"><div className="flex flex-col justify-between gap-ui-xs md:flex-row"><div><Button variant="link" className="ui-task-title" onClick={(event) => { event.stopPropagation(); onSelect(); }} type="button">{task.title}</Button><p className="text-body-md text-muted-foreground">{task.description || "No task notes yet."}</p></div><span className="text-body-sm text-muted-foreground">Updated {formatDateTime(task.updated_at)}</span></div><Meta task={task} /></CardContent></Card>;
}
