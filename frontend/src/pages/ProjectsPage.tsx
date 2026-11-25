import { notify } from "../lib/notify";
import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { colorMix } from "@/lib/color";import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Plus as AddIcon,
    CirclePlus as AddCircleOutlineIcon,
    FolderOpen as FolderOpenIcon,
    ArrowRight,
    X as CloseIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { projectPath } from "@/config/routes";
import { createProject, listProjects } from "../api/projects";
import { queryKeys } from "../config/queryKeys";
import { QUERY_STALE_TIMES } from "../config/queryTiming";
import { EmptyState } from "../components/ui/EmptyState";
import { PageShell } from "../components/ui/PageShell";
import { QueryBoundary } from "../components/ui/QueryBoundary";
import { SectionCard } from "../components/ui/SectionCard";
import { usePlatformMetadata } from "../hooks/usePlatformMetadata";
import { formatDate } from "../utils/formatters";

const projectSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(255),
    description: z.string().optional(),
});

type ProjectValues = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [, setCreateDrawerOpen] = useState(false);
    const { data: platformMetadata } = usePlatformMetadata();
    const { data: projects, isLoading, isError, error, refetch } = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
        staleTime: QUERY_STALE_TIMES.projects,
    });
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProjectValues>({ resolver: zodResolver(projectSchema) });

    const mutation = useMutation({
        mutationFn: createProject,
        onSuccess: async (project) => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
            reset();
            setCreateDrawerOpen(false);
            notify({ message: "Project created successfully.", severity: "success" });
            navigate(projectPath(project.id));
        },
    });

    const coreDomainSingular = platformMetadata?.core_domain_singular ?? "Project";
    const coreDomainPlural = platformMetadata?.core_domain_plural ?? "Projects";

    function openCreateDrawer() {
        mutation.reset();
        setCreateDrawerOpen(true);
    }

    function closeCreateDrawer() {
        setCreateDrawerOpen(false);
    }

    const createForm = (
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4">
                <FormField
                    label={`${coreDomainSingular} name`}
                    placeholder={`Acme ${coreDomainSingular}`}
                    {...register("name")}
                    error={!!errors.name}
                    description={errors.name?.message} />
                <FormField
                    label="Description"
                    placeholder={`What is this ${coreDomainSingular.toLowerCase()} for?`}
                    {...register("description")}
                    error={!!errors.description}
                    description={errors.description?.message}
                    as="textarea"
                    rows={4} />
                {mutation.isError && (
                    <div role="alert" className="rounded-lg border border-border p-3 text-sm">
                        {mutation.error instanceof Error
                            ? mutation.error.message
                            : `Failed to create ${coreDomainSingular.toLowerCase()}.`}
                    </div>
                )}
                <Button type="submit" variant="default" disabled={mutation.isPending}><AddCircleOutlineIcon />{mutation.isPending ? "Creating..." : `Create ${coreDomainSingular}`}</Button>
        </form>
    );

    return (
        <PageShell width="wide">
            <SectionCard
                title={`Your ${coreDomainPlural}`}
                description={`Browse the current ${coreDomainPlural.toLowerCase()} and scan for missing descriptions or naming gaps.`}
                action={
                    <Button variant="default" onClick={openCreateDrawer} type="button"><AddIcon />New {coreDomainSingular.toLowerCase()}
                    </Button>
                }
            >
                <QueryBoundary
                    isLoading={isLoading}
                    isError={isError}
                    error={error}
                    errorFallback={`Failed to load ${coreDomainPlural.toLowerCase()}.`}
                    onRetry={() => void refetch()}
                    loadingFallback={
                        <div
                            style={{
                                display: "grid",
                                gap: 12,
                                gridTemplateColumns: "1fr",
                            }}
                        >
                            {Array.from({ length: 4 }).map((_: any, index: any) => (
                                <div
                                    key={index}
                                    style={{ borderRadius: 16 }}
                                    className="animate-pulse rounded-md bg-muted" />
                            ))}
                        </div>
                    }
                    isEmpty={!projects || projects.length === 0}
                    emptyFallback={
                        <EmptyState
                            icon={<FolderOpenIcon />}
                            title={`No ${coreDomainPlural.toLowerCase()} yet`}
                            description={`Create the first ${coreDomainSingular.toLowerCase()} to give the workspace structure and momentum.`}
                            action={
                                <Button
                                    variant="default"
                                    onClick={openCreateDrawer}
                                    type="button"
                                ><AddIcon />New {coreDomainSingular.toLowerCase()}
                                </Button>
                            }
                        />
                    }
                >
                    <div
                        style={{
                            display: "grid",
                            gap: 12,
                            gridTemplateColumns: "1fr",
                        }}
                    >
                        {projects?.map((project) => (
                            <div
                                key={project.id}
                                style={({
                                    padding: 20,
                                    borderRadius: 16,
                                    border: `1px solid ${"var(--border)"}`,
                                    backgroundColor: "var(--card)"
                                })}
                            >
                                <div className="flex gap-2.5">
                                    <div className="flex flex-row gap-2.5 items-center">
                                        <div
                                            style={({
                                                width: 42,
                                                height: 42,
                                                borderRadius: 12,
                                                display: "grid",
                                                placeItems: "center",
                                                color: "var(--primary)",
                                                backgroundColor: colorMix("var(--primary)", 0.13)
                                            })}
                                        >
                                            <FolderOpenIcon />
                                        </div>
                                        <div>
                                            <p>
                                                {project.name}
                                            </p>
                                            <span className="text-muted-foreground">
                                                Created {formatDate(project.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground">
                                        {project.description ||
                                            `No description yet for this ${coreDomainSingular.toLowerCase()}.`}
                                    </p>
                                    <div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => navigate(projectPath(project.id))}
                                            type="button">Open workspace
                                                                                    <ArrowRight /></Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </QueryBoundary>
            </SectionCard>

            <div>
                <div
                    style={{
                        padding: 20,
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        height: "100%",
                        overflow: "auto",
                    }}
                >
                    <div className="flex flex-row items-center justify-between">
                        <h6>Create {coreDomainSingular}</h6>
                        <Button size="icon"
                            aria-label="Close create project"
                            onClick={closeCreateDrawer}

                        >
                            <CloseIcon />
                        </Button>
                    </div>
                    <p className="text-muted-foreground">
                        Start a new {coreDomainSingular.toLowerCase()} with a clear name and
                        optional context.
                    </p>
                    {createForm}
                </div>
            </div>
        </PageShell>
    );
}
