import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import type { CalendarItemType } from "../../../api/calendar";
import type { ProjectTaskPriority } from "../../../api/projects";
import { PROJECT_TASK_PRIORITIES } from "../../projects/taskOptions";
import { formatDateOnly, humanizeKey } from "../../../utils/formatters";
import { ITEM_TYPE_OPTIONS } from "../calendarDisplay";
import { DayItems } from "./DayItems";
import type { DashboardCalendarModel } from "../hooks/useDashboardCalendar";


export function CalendarItemDrawer({ m }: { m: DashboardCalendarModel }) {
    const { setDrawerOpen, selectedDateKey, draft, setDraft, fieldErrors, setFieldErrors, projects, projectsLoading, onOpenProjects, createItemMutation, submitDraft, itemsByDate } = m;
    return (
        <div>
            <div className="flex gap-[16px]">
                <div>
                    <h5 style={{ marginBottom: 4 }}>
                        {selectedDateKey ? formatDateOnly(selectedDateKey) : "Select a day"}
                    </h5>
                    <p className="text-muted-foreground">
                        Add an event, appointment, or a real task due on this day.
                    </p>
                </div>

                <hr className="border-border" />

                <div>
                    <p style={{ marginBottom: 8 }}>
                        Day agenda
                    </p>
                    <DayItems
                        items={selectedDateKey ? itemsByDate[selectedDateKey] ?? [] : []}
                        emptyTitle="Nothing scheduled yet"
                        emptyDescription="Pick a type below and add the first calendar item for this day."
                    />
                </div>

                <hr className="border-border" />

                <div className="flex gap-[12px]">
                    <p>Add new item</p>
                    <FormField
                        label="Type"
                        as="select"
                        value={draft.type}
                        onChange={(event: any) => {
                            const nextType = event.target.value as CalendarItemType;
                            setDraft((current) => ({
                                ...current,
                                type: nextType,
                                start_time: nextType === "task" ? "" : current.start_time,
                                end_time: nextType === "task" ? "" : current.end_time,
                                project_id: current.project_id || projects[0]?.id || "",
                            }));
                            setFieldErrors({});
                        }}>
                        {ITEM_TYPE_OPTIONS.map((option) => (
                            <option key={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </FormField>
                    <FormField
                        label="Title"
                        value={draft.title}
                        onChange={(event: any) => {
                            setDraft((current) => ({ ...current, title: event.target.value }));
                            setFieldErrors((current) => ({ ...current, title: undefined }));
                        }}
                        error={Boolean(fieldErrors.title)}
                        description={fieldErrors.title} />
                    <FormField
                        label="Description"
                        value={draft.description}
                        onChange={(event: any) =>
                            setDraft((current) => ({ ...current, description: event.target.value }))
                        }
                        multiline
                        rows={3} />

                    {draft.type === "task" ? (
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
                                error={Boolean(fieldErrors.project_id)}
                                description={
                                    fieldErrors.project_id ??
                                    (projects.length > 0
                                        ? "Task will be created in Todo with this date as its due date."
                                        : "Create a project first before scheduling tasks from the calendar.")
                                }>
                                {projects.map((project) => (
                                    <option key={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </FormField>
                            <FormField
                                label="Priority"
                                as="select"
                                value={draft.priority}
                                onChange={(event: any) =>
                                    setDraft((current) => ({
                                        ...current,
                                        priority: event.target.value as ProjectTaskPriority,
                                    }))
                                }>
                                {PROJECT_TASK_PRIORITIES.map((priority) => (
                                    <option key={priority}>
                                        {humanizeKey(priority)}
                                    </option>
                                ))}
                            </FormField>
                            {projects.length === 0 && (
                                <Button variant="outline" onClick={onOpenProjects} type="button">
                                    Create a project
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-[10px]">
                            <FormField
                                label="Start time"
                                type="time"
                                value={draft.start_time}
                                onChange={(event: any) => {
                                    setDraft((current) => ({ ...current, start_time: event.target.value }));
                                    setFieldErrors((current) => ({
                                        ...current,
                                        start_time: undefined,
                                        end_time: undefined,
                                    }));
                                }}
                                error={Boolean(fieldErrors.start_time)}
                                description={fieldErrors.start_time}
                                InputLabelProps={{ shrink: true }} />
                            <FormField
                                label="End time"
                                type="time"
                                value={draft.end_time}
                                onChange={(event: any) => {
                                    setDraft((current) => ({ ...current, end_time: event.target.value }));
                                    setFieldErrors((current) => ({ ...current, end_time: undefined }));
                                }}
                                error={Boolean(fieldErrors.end_time)}
                                description={fieldErrors.end_time}
                                InputLabelProps={{ shrink: true }} />
                        </div>
                    )}

                    {fieldErrors.general && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{fieldErrors.general}</div>}

                    <div className="flex flex-row gap-[8px]">
                        <Button variant="outline" onClick={() => setDrawerOpen(false)} type="button">
                            Close
                        </Button>
                        <Button
                            variant="default"
                            onClick={submitDraft}
                            disabled={
                                createItemMutation.isPending ||
                                (draft.type === "task" && projects.length === 0)
                            }
                            type="button">
                            {createItemMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
