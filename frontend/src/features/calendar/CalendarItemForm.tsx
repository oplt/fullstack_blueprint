import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/FormGrid";
import type { CalendarItemType } from "./api";
import type { ProjectTaskPriority } from "@/features/projects/api";
import { PROJECT_TASK_PRIORITIES } from "../projects/projectTaskOptions";
import { humanizeKey } from "@/lib/formatters";
import { ITEM_TYPE_OPTIONS } from "./calendarDisplay";
import type { DashboardCalendarModel } from "./useDashboardCalendar";

function CalendarItemTypeField({ model }: { model: DashboardCalendarModel }) {
    const { draft, setDraft, setFieldErrors, projects, projectsEnabled } = model;
    return (
        <FormField
            label="Type"
            as="select"
            value={draft.type}
            onChange={(event: any) => {
                const type = event.target.value as CalendarItemType;
                setDraft((current) => ({
                    ...current,
                    type,
                    start_time: type === "task" ? "" : current.start_time,
                    end_time: type === "task" ? "" : current.end_time,
                    project_id: current.project_id || projects[0]?.id || "",
                }));
                setFieldErrors({});
            }}
        >
            {ITEM_TYPE_OPTIONS.filter((option) => projectsEnabled || option.value !== "task").map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </FormField>
    );
}

function CalendarItemTitleFields({ model }: { model: DashboardCalendarModel }) {
    return (
        <>
            <FormField
                label="Title"
                value={model.draft.title}
                onChange={(event: any) => {
                    model.setDraft((current) => ({ ...current, title: event.target.value }));
                    model.setFieldErrors((current) => ({ ...current, title: undefined }));
                }}
                error={Boolean(model.fieldErrors.title)}
                description={model.fieldErrors.title}
            />
            <FormField
                label="Description"
                value={model.draft.description}
                onChange={(event: any) => model.setDraft((current) => ({ ...current, description: event.target.value }))}
                as="textarea"
                rows={3}
            />
        </>
    );
}

function CalendarTaskFields({ model }: { model: DashboardCalendarModel }) {
    const { draft, setDraft, setFieldErrors, projects, projectsLoading, projectsEnabled, onOpenProjects } = model;
    if (draft.type !== "task" || !projectsEnabled) return null;
    return (
        <>
            <FormField
                label="Project"
                as="select"
                value={draft.project_id}
                onChange={(event: any) => {
                    setDraft((current) => ({ ...current, project_id: event.target.value }));
                    setFieldErrors((current) => ({ ...current, project_id: undefined }));
                }}
                disabled={projectsLoading}
                error={Boolean(model.fieldErrors.project_id)}
                description={model.fieldErrors.project_id ?? (
                    projects.length
                        ? "Task will be created in Todo with this date as its due date."
                        : "Create a project first before scheduling tasks from the calendar."
                )}
            >
                {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                ))}
            </FormField>
            <FormField
                label="Priority"
                as="select"
                value={draft.priority}
                onChange={(event: any) => setDraft((current) => ({
                    ...current,
                    priority: event.target.value as ProjectTaskPriority,
                }))}
            >
                {PROJECT_TASK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>{humanizeKey(priority)}</option>
                ))}
            </FormField>
            <CreateProjectAction projectsEmpty={!projects.length} onOpenProjects={onOpenProjects} />
        </>
    );
}

function CreateProjectAction({
    projectsEmpty, onOpenProjects,
}: { projectsEmpty: boolean; onOpenProjects?: () => void }) {
    if (!projectsEmpty || !onOpenProjects) return null;
    return <Button variant="outline" onClick={onOpenProjects} type="button">Create a project</Button>;
}

function CalendarScheduleFields({ model }: { model: DashboardCalendarModel }) {
    const { draft, setDraft, setFieldErrors } = model;
    if (draft.type === "task") return null;
    return (
        <FormGrid columns="2">
            <FormField
                label="Start time"
                type="time"
                value={draft.start_time}
                onChange={(event: any) => {
                    setDraft((current) => ({ ...current, start_time: event.target.value }));
                    setFieldErrors((current) => ({ ...current, start_time: undefined, end_time: undefined }));
                }}
                error={Boolean(model.fieldErrors.start_time)}
                description={model.fieldErrors.start_time}
            />
            <FormField
                label="End time"
                type="time"
                value={draft.end_time}
                onChange={(event: any) => {
                    setDraft((current) => ({ ...current, end_time: event.target.value }));
                    setFieldErrors((current) => ({ ...current, end_time: undefined }));
                }}
                error={Boolean(model.fieldErrors.end_time)}
                description={model.fieldErrors.end_time}
            />
        </FormGrid>
    );
}

function CalendarItemActions({ model }: { model: DashboardCalendarModel }) {
    const taskCannotBeSaved = model.draft.type === "task" && (!model.projectsEnabled || !model.projects.length);
    return (
        <div className="flex gap-ui-xs">
            <Button variant="outline" onClick={() => model.setDrawerOpen(false)} type="button">Close</Button>
            <Button
                variant="default"
                onClick={model.submitDraft}
                disabled={model.createItemMutation.isPending || taskCannotBeSaved}
                type="button"
            >
                {model.createItemMutation.isPending ? "Saving..." : "Save"}
            </Button>
        </div>
    );
}

export function CalendarItemForm({ model }: { model: DashboardCalendarModel }) {
    return (
        <section aria-label="Add a calendar item" className="flex flex-col gap-ui-sm">
            <h3 className="font-medium">Add new item</h3>
            <CalendarItemTypeField model={model} />
            <CalendarItemTitleFields model={model} />
            <CalendarTaskFields model={model} />
            <CalendarScheduleFields model={model} />
            {model.fieldErrors.general && <Alert variant="destructive"><AlertDescription>{model.fieldErrors.general}</AlertDescription></Alert>}
            <CalendarItemActions model={model} />
        </section>
    );
}
