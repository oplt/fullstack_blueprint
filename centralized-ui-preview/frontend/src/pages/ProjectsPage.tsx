import { notify } from "../lib/notify";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
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
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-ui-md">
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
                    <div role="alert" className="ui-auto-projects-page-div">
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
                        <div className="grid min-w-0 gap-ui-sm">
                            {Array.from({ length: 4 }, (_, index) => (
                                <Skeleton key={index} className="w-full ui-auto-projects-page-skeleton" />
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
                    <div className="grid min-w-0 gap-ui-sm">
                        {projects?.map((project) => (
                            <Card key={project.id} className="min-w-0 p-ui-lg">
                                <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:justify-between gap-ui-sm">
                                    <div className="flex min-w-0 items-center gap-ui-sm">
                                        <div className="grid shrink-0 ui-auto-projects-page-div-4627848">
                                            <FolderOpenIcon aria-hidden="true" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="ui-auto-projects-page-p">{project.name}</p>
                                            <span className="ui-auto-projects-page-span">
                                                Created {formatDate(project.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="min-w-0 flex-1 ui-auto-projects-page-p-73383af">
                                        {project.description ||
                                            `No description yet for this ${coreDomainSingular.toLowerCase()}.`}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        onClick={() => navigate(projectPath(project.id))}
                                        type="button"
                                        className="shrink-0"
                                    >Open workspace<ArrowRight /></Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </QueryBoundary>
            </SectionCard>

            <div>
                <div className="flex h-full min-w-0 flex-col overflow-auto ui-auto-projects-page-div-fadc4e5">
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
