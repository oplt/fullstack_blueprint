import { Button } from "@/components/ui/button";import { colorMix } from "@/lib/color";import {
    Add as AddIcon,
    PlaylistAddCheck as TaskIcon,
} from "@/components/ui/iconsCompat";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { ProjectTask } from "../../../api/projects";
import type { ProjectDetailModel } from "../hooks/useProjectDetail";
import { TASK_STATUS_OPTIONS } from "../projectTaskModel";
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
    return (
        <SectionCard
            title="Project flow"
            description="Switch between a sortable Kanban board and a detailed list view."
            action={
                <div className="flex flex-row gap-[8px] items-center flex-wrap">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={onNewTask}
                        type="button"
                    ><AddIcon />New task
                                            </Button>
                    <div className="flex gap-1" style={{ minHeight: "auto" }} role="tablist" aria-label="Task view">
                        <Button variant={m.taskView === "board" ? "default" : "outline"} size="sm" onClick={() => m.setTaskView("board")} type="button">Board</Button>
                        <Button variant={m.taskView === "list" ? "default" : "outline"} size="sm" onClick={() => m.setTaskView("list")} type="button">List</Button>
                    </div>
                </div>
            }
        >
            {m.tasksQuery.isLoading ? (
                <div className="flex gap-[12px]">
                    <div
                        style={{ borderRadius: 12 }}
                        className="animate-pulse rounded-md bg-muted" />
                    <div
                        style={{ borderRadius: 12 }}
                        className="animate-pulse rounded-md bg-muted" />
                </div>
            ) : m.orderedTasks.length === 0 ? (
                <EmptyState
                    icon={<TaskIcon />}
                    title="No tasks yet"
                    description="Use New task to add the first item to this project flow."
                    action={
                        <Button variant="default" onClick={onNewTask} type="button"><AddIcon />New task
                                                    </Button>
                    }
                />
            ) : m.taskView === "list" ? (
                <div className="flex gap-[12px]">
                    {m.orderedTasks.map((task) => (
                        <TaskListCard
                            key={task.id}
                            task={task}
                            selected={task.id === m.selectedTaskId}
                            onSelect={() => onSelectTask(task)}
                        />
                    ))}
                </div>
            ) : (
                <div
                    style={{
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        paddingBottom: 8,
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gap: 12,
                            minWidth: 1280,
                            gridTemplateColumns: "repeat(5, minmax(240px, 1fr))",
                        }}
                    >
                        {TASK_STATUS_OPTIONS.map((option) => {
                            const tasks = m.orderedTasks.filter(
                                (task) => task.status === option.value
                            );
                            return (
                                <div
                                    key={option.value}
                                    onDragOver={(e: any) => e.preventDefault()}
                                    onDrop={(e: any) => {
                                        e.preventDefault();
                                        m.drop(option.value);
                                    }}
                                    style={({
                                        minHeight: 240,
                                        padding: 10,
                                        borderRadius: 16,
                                        border: `1px solid ${"var(--border)"}`,

                                        backgroundColor: colorMix(
                                            "var(--card)",
                                            (0.82 + 0.72
                                        ) / 2)
                                    })}
                                >
                                    <div className="flex gap-[10px]">
                                        <div className="flex flex-row justify-between">
                                            <p>
                                                {option.label}
                                            </p>
                                            <div
                                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                        </div>
                                        <hr className="border-border" />
                                        <div className="flex gap-[8px]">
                                            {tasks.length ? (
                                                tasks.map((task) => (
                                                    <TaskBoardCard
                                                        key={task.id}
                                                        task={task}
                                                        selected={task.id === m.selectedTaskId}
                                                        isDragging={m.draggingTaskId === task.id}
                                                        onSelect={() => onSelectTask(task)}
                                                        onDragStart={() =>
                                                            m.setDraggingTaskId(task.id)
                                                        }
                                                        onDropBefore={() =>
                                                            m.drop(option.value, task.id)
                                                        }
                                                        onMove={(status) =>
                                                            m.drop(status, undefined, task.id)
                                                        }
                                                    />
                                                ))
                                            ) : (
                                                <div
                                                    style={({
                                                        padding: 16,
                                                        borderRadius: 12,
                                                        border: `1px dashed ${"var(--border)"}`,
                                                        textAlign: "center",
                                                        color: "text.secondary"
                                                    })}
                                                >
                                                    <p>
                                                        Drop tasks here
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </SectionCard>
    );
}
