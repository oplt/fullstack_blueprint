import type { DragEvent } from "react";
import { Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "../../components/ui/EmptyState";
import { SectionCard } from "../../components/ui/SectionCard";
import type { ProjectTask } from "@/features/projects/api";
import type { ProjectDetailModel } from "./useProjectDetail";
import { TASK_STATUS_OPTIONS } from "./projectTaskModel";
import { TaskBoardCard, TaskListCard } from "./ProjectTaskCards";

type ProjectFlowSectionProps = {
    model: ProjectDetailModel;
    onNewTask: () => void;
    onSelectTask: (task: ProjectTask) => void;
};

export function ProjectFlowSection({
    model: m,
    onNewTask,
    onSelectTask,
}: ProjectFlowSectionProps) {
    const loading = m.tasksQuery.isLoading;
    const empty = m.orderedTasks.length === 0;

    function renderLoading() {
        return (
            <div className="flex gap-ui-sm" aria-busy="true">
                <div className="h-40 min-w-60 flex-1 animate-pulse rounded-md bg-muted" />
                <div className="h-40 min-w-60 flex-1 animate-pulse rounded-md bg-muted" />
            </div>
        );
    }

    function renderEmpty() {
        return (
            <EmptyState
                icon={<ListChecks />}
                title="No tasks yet"
                description="Use New task to add the first item to this project flow."
                action={
                    <Button variant="default" onClick={onNewTask} type="button">
                        <Plus />New task
                    </Button>
                }
            />
        );
    }

    function renderBoard() {
        return (
            <div className="overflow-x-auto overscroll-x-contain pb-ui-xs">
                <div className="grid min-w-[1280px] grid-cols-[repeat(5,minmax(240px,1fr))] gap-ui-sm">
                    {TASK_STATUS_OPTIONS.map((option) => {
                        const tasks = m.orderedTasks.filter(
                            (task) => task.status === option.value,
                        );
                        return (
                            <div
                                key={option.value}
                                onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
                                onDrop={(event: DragEvent<HTMLDivElement>) => {
                                    event.preventDefault();
                                    m.drop(option.value);
                                }}
                                className="min-h-60 rounded-md border border-border bg-card p-ui-sm"
                            >
                                <div className="mb-ui-sm">
                                    <p className="font-medium">{option.label}</p>
                                </div>
                                <hr className="mb-ui-sm border-border" />
                                <div className="flex flex-col gap-ui-xs">
                                    {tasks.length ? (
                                        tasks.map((task) => (
                                            <TaskBoardCard
                                                key={task.id}
                                                task={task}
                                                selected={task.id === m.selectedTaskId}
                                                isDragging={m.draggingTaskId === task.id}
                                                onSelect={() => onSelectTask(task)}
                                                onDragStart={() => m.setDraggingTaskId(task.id)}
                                                onDropBefore={() => m.drop(option.value, task.id)}
                                                onMove={(status) => m.drop(status, undefined, task.id)}
                                            />
                                        ))
                                    ) : (
                                        <div className="rounded-md border border-dashed border-border p-ui-md text-center text-body-md text-muted-foreground">
                                            Drop tasks here
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <SectionCard
            title="Project flow"
            description="Switch between a sortable Kanban board and a detailed list view."
            action={
                <Button variant="default" size="sm" onClick={onNewTask} type="button">
                    <Plus />New task
                </Button>
            }
        >
            <Tabs
                value={m.taskView}
                onValueChange={(value) => {
                    if (value === "board" || value === "list") m.setTaskView(value);
                }}
                className="min-w-0 gap-ui-sm"
            >
                <TabsList aria-label="Task view">
                    <TabsTrigger value="board">Board</TabsTrigger>
                    <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
                <TabsPanel value="board">
                    {loading ? renderLoading() : empty ? renderEmpty() : renderBoard()}
                </TabsPanel>
                <TabsPanel value="list">
                    {loading ? renderLoading() : empty ? renderEmpty() : (
                        <div className="flex flex-col gap-ui-sm">
                            {m.orderedTasks.map((task) => (
                                <TaskListCard
                                    key={task.id}
                                    task={task}
                                    selected={task.id === m.selectedTaskId}
                                    onSelect={() => onSelectTask(task)}
                                />
                            ))}
                        </div>
                    )}
                </TabsPanel>
            </Tabs>
        </SectionCard>
    );
}
