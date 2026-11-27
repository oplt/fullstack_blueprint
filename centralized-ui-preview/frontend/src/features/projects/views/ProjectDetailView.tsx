import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
    ArrowLeft as BackIcon,
    ClipboardCheck as DoneIcon,
    Calendar as CalendarIcon,
    X as CloseIcon,
    ListChecks as TaskIcon,
    Kanban as BoardIcon,
} from "lucide-react";
import type { ProjectTask } from "../../../api/projects";
import { ROUTES } from "@/config/routes";
import { PageShell } from "../../../components/ui/PageShell";
import { MetricGrid } from "../../../components/ui/MetricGrid";
import { StatCard } from "../../../components/ui/StatCard";
import { StatCardSkeletonGrid } from "../../../components/ui/StatCardSkeletonGrid";
import { getQueryErrorMessage } from "../../../utils/queryErrors";
import { ProjectFlowSection } from "../components/ProjectFlowSection";
import { TaskEditorSection } from "../components/TaskEditorSection";
import { useProjectDetail } from "../hooks/useProjectDetail";

export default function ProjectDetailPage() {
    const m = useProjectDetail();
    const [, setTaskDrawerOpen] = useState(false);

    if (m.projectQuery.isLoading) {
        return (
            <PageShell width="wide">
                <div className="flex gap-ui-md">
                    <div
                        className="ui-auto-project-detail-view-project-detail-page-div"
                        style={{
                            height: 48,
                            width: 280
                        }} />
                    <div
                        className="ui-auto-project-detail-view-project-detail-page-div-27535a1"
                        style={{
                            height: 28,
                            width: "60%"
                        }} />
                    <StatCardSkeletonGrid />
                    <div

                        className="ui-auto-project-detail-view-project-detail-page-div-27535a1-x" />
                </div>
            </PageShell>
        );
    }

    if (!m.projectQuery.data) {
        return (
            <PageShell width="wide">
                <div role="alert" className="ui-auto-project-detail-view-project-detail-page-div-bac2659">
                    {getQueryErrorMessage(m.projectQuery.error, "Project not found.")}
                </div>
            </PageShell>
        );
    }

    const done = m.orderedTasks.filter((task) => task.status === "done").length;
    const flight = m.orderedTasks.filter((task) =>
        ["todo", "in_progress", "review"].includes(task.status)
    ).length;
    const overdue = m.orderedTasks.filter(
        (task) =>
            task.status !== "done" &&
            task.due_date &&
            new Date(`${task.due_date}T23:59:59`) < new Date()
    ).length;

    function openNewTask() {
        m.createMutation.reset();
        m.deleteMutation.reset();
        m.reset();
        setTaskDrawerOpen(true);
    }

    function openTask(task: ProjectTask) {
        m.createMutation.reset();
        m.deleteMutation.reset();
        m.select(task);
        setTaskDrawerOpen(true);
    }

    function closeTaskDrawer() {
        setTaskDrawerOpen(false);
    }

    return (
        <PageShell width="wide">
            <div className="flex flex-row ui-auto-project-detail-view-project-detail-page-div-c8602a2" >
                <Button
                    variant="outline"
                    onClick={() => m.navigate(ROUTES.projects)}
                    type="button"
                ><BackIcon />Back to projects
                                    </Button>
            </div>

            <h4 className="mb-ui-xs" >
                {m.projectQuery.data.name}
            </h4>
            {m.projectQuery.data.description && (
                <span  className="ui-auto-project-detail-view-project-detail-page-span">
                    {m.projectQuery.data.description}
                </span>
            )}
            <MetricGrid>
                <StatCard
                    label="Total tasks"
                    value={m.orderedTasks.length}
                    description="All tracked work items inside this project"
                    icon={<TaskIcon />}
                />
                <StatCard
                    label="In flight"
                    value={flight}
                    description="Tasks currently being worked, reviewed, or queued next"
                    icon={<BoardIcon />}
                    color="warning"
                />
                <StatCard
                    label="Completed"
                    value={done}
                    description="Tasks already moved to done"
                    icon={<DoneIcon />}
                    color="success"
                />
                <StatCard
                    label="Overdue"
                    value={overdue}
                    description="Open tasks with a due date already behind today"
                    icon={<CalendarIcon />}
                    color={overdue > 0 ? "error" : "secondary"}
                />
            </MetricGrid>

            {(m.projectQuery.error || m.tasksQuery.error) && (
                <div

                    role="alert"
                    className="ui-auto-project-detail-view-project-detail-page-div-cc9f902">
                    {getQueryErrorMessage(
                        m.projectQuery.error ?? m.tasksQuery.error,
                        "Failed to load project workspace."
                    )}
                </div>
            )}

            <ProjectFlowSection model={m} onNewTask={openNewTask} onSelectTask={openTask} />

            <div>
                <div
                    className="ui-auto-project-detail-view-project-detail-page-div-57217fb" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}
                >
                    <div className="flex flex-row items-center justify-between">
                        <h6>
                            {m.selectedTask ? "Edit task" : "Create task"}
                        </h6>
                        <Button size="icon"
                            aria-label="Close task editor"
                            onClick={closeTaskDrawer}

                        >
                            <CloseIcon />
                        </Button>
                    </div>
                    <p className="text-muted-foreground">
                        {m.selectedTask
                            ? "Update task details, assignee, due date, or status."
                            : "Add the next task and place it directly into the workflow."}
                    </p>
                    <TaskEditorSection model={m} embedded />
                </div>
            </div>
        </PageShell>
    );
}
