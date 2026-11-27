import { Button } from "@/components/ui/button";
import { FolderOpen as ProjectsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "../../../api/projects";
import { projectPath, ROUTES } from "@/config/routes";
import { EmptyState } from "../../../components/ui/EmptyState";
import { QueryBoundary } from "../../../components/ui/QueryBoundary";
import { SectionCard } from "../../../components/ui/SectionCard";

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
                        icon={<ProjectsIcon />}
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
                            className="dashboard-project ui-auto-project-snapshot-link"
                        >
                            <p>{project.name}</p>
                            <p className="ui-auto-project-snapshot-p">
                                {project.description || `No description added for this ${coreDomainSingular.toLowerCase()} yet.`}
                            </p>
                        </Link>
                    ))}
                    {projects && projects.length > 6 && <Link className="ui-auto-project-snapshot-link-8e814b5" to={ROUTES.projects}>View all</Link>}
                </div>
            </QueryBoundary>
        </SectionCard>
    );
}
