import { Button } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "@/features/projects/api";
import { projectPath, ROUTES } from "../../lib/routes";
import { EmptyState } from "../../components/ui/EmptyState";
import { QueryBoundary } from "../../components/ui/QueryBoundary";
import { SectionCard } from "../../components/ui/SectionCard";

type Props = {
    enabled: boolean;
    projects?: Project[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    coreDomainPlural: string;
    coreDomainSingular: string;
    onRetry: () => void;
    onCreate: () => void;
};

export function ProjectSnapshot({
    enabled, projects, isLoading, isError, error, coreDomainPlural, coreDomainSingular,
    onRetry, onCreate,
}: Props) {
    if (!enabled) return null;
    return (
        <SectionCard
            title={`${coreDomainPlural} snapshot`}
            description={`A quick look at the current ${coreDomainPlural.toLowerCase()} in your workspace.`}
        >
            <QueryBoundary
                isLoading={isLoading}
                isError={isError}
                error={error}
                errorFallback={`Failed to load ${coreDomainPlural.toLowerCase()}.`}
                onRetry={onRetry}
                isEmpty={!projects?.length}
                emptyFallback={
                    <EmptyState
                        icon={<FolderOpen />}
                        title={`No ${coreDomainPlural.toLowerCase()} yet`}
                        description={`Create your first ${coreDomainSingular.toLowerCase()} to start building out the workspace.`}
                        action={<Button onClick={onCreate} type="button">Create {coreDomainSingular}</Button>}
                    />
                }
            >
                <div className="stack dashboard-project-list">
                    {projects?.slice(0, 6).map((project) => (
                        <Link
                            key={project.id}
                            to={projectPath(project.id)}
                            className="dashboard-project control-focus"
                        >
                            <p>{project.name}</p>
                            <p className="mt-1 text-muted-foreground">
                                {project.description || `No description added for this ${coreDomainSingular.toLowerCase()} yet.`}
                            </p>
                        </Link>
                    ))}
                    {projects && projects.length > 6 && <Link className="text-body-md text-primary underline-offset-4 hover:underline" to={ROUTES.projects}>View all</Link>}
                </div>
            </QueryBoundary>
        </SectionCard>
    );
}
