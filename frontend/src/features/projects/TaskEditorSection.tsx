import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import { Trash2 } from "lucide-react";
import { QueryErrorAlert } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/Section";
import { formatDateTime } from "@/lib/formatters";
import { getQueryErrorMessage } from "../../lib/queryErrors";
import type { ProjectDetailModel } from "./useProjectDetail";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "./projectTaskModel";

type TaskEditorSectionProps = {
    model: ProjectDetailModel;
    /** When true, render the form only (drawer provides chrome). */
    embedded?: boolean;
};

export function TaskEditorSection({ model: m, embedded = false }: TaskEditorSectionProps) {
    const d = m.taskDraft;
    const form = (
        <div className="flex gap-ui-md">
            <FormField
                label="Title"
                {...m.taskForm.register("title")}
                error={Boolean(m.taskForm.formState.errors.title)}
                description={m.taskForm.formState.errors.title?.message}
            />
            <FormField
                label="Description"
                {...m.taskForm.register("description")}
                error={Boolean(m.taskForm.formState.errors.description)}
                description={m.taskForm.formState.errors.description?.message}
                as="textarea"
                rows={4}
            />
            <FormField label="Status" as="select" value={d.status} {...m.taskForm.register("status")}>
                {TASK_STATUS_OPTIONS.map((o) => (
                    <option key={o.value}>
                        {o.label}
                    </option>
                ))}
            </FormField>
            <FormField
                label="Priority"
                as="select"
                value={d.priority}
                {...m.taskForm.register("priority")}
            >
                {TASK_PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value}>
                        {o.label}
                    </option>
                ))}
            </FormField>
            <FormField
                label="Due date"
                type="date"
                {...m.taskForm.register("due_date")}
            />
            <FormField
                label="Assignee"
                as="select"
                value={d.assignee_id}
                {...m.taskForm.register("assignee_id")}
                error={m.usersQuery.isError}
                description={
                    m.usersQuery.isError
                        ? getQueryErrorMessage(m.usersQuery.error, "Failed to load user directory.")
                        : undefined
                }
            >
                <option>Unassigned</option>
                {(m.usersQuery.data ?? []).map((u) => (
                    <option key={u.id}>
                        {u.full_name || u.email}
                    </option>
                ))}
            </FormField>
            {m.usersQuery.isError && (
                <QueryErrorAlert
                    error={m.usersQuery.error}
                    fallback="Failed to load assignee directory."
                    onRetry={() => void m.usersQuery.refetch()}
                />
            )}
            {m.selectedTask && (
                <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">
                    Created {formatDateTime(m.selectedTask.created_at)}. Last updated{" "}
                    {formatDateTime(m.selectedTask.updated_at)}.
                </div>
            )}
            {m.taskError && <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">{m.taskError}</div>}
            <div className="flex flex-row gap-ui-sm">
                <Button
                    variant="default"
                    onClick={m.submit}
                    disabled={m.createMutation.isPending || m.updateMutation.isPending}
                    type="button">
                    {m.selectedTask
                        ? m.updateMutation.isPending
                            ? "Saving..."
                            : "Save task"
                        : m.createMutation.isPending
                          ? "Creating..."
                          : "Create task"}
                </Button>
                {m.selectedTask && (
                    <Button
                        variant="destructive"
                        onClick={() => m.deleteMutation.mutate()}
                        disabled={m.deleteMutation.isPending}
                        type="button"><Trash2 />
                        {m.deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                )}
            </div>
        </div>
    );

    if (embedded) return form;

    return (
        <SectionCard
            title={m.selectedTask ? "Edit task" : "Create task"}
            description={
                m.selectedTask
                    ? "Update task details, assignee, due date, or status."
                    : "Add the next task and place it directly into the workflow."
            }
        >
            {form}
        </SectionCard>
    );
}
