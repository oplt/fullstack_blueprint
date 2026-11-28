import type { ProjectTaskPriority } from "@/features/projects/api";

export const PROJECT_TASK_PRIORITIES = [
    "low",
    "medium",
    "high",
    "urgent",
] as const satisfies readonly ProjectTaskPriority[];
