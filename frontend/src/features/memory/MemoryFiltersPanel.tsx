import { Button } from "@/components/ui/button";
import { FormField } from "../../components/ui/form-field";
import { SectionCard } from "../../components/ui/SectionCard";
import { Search as SearchIcon } from "lucide-react";
import { MEMORY_LEVELS, useMemoryWorkspace } from "./hooks/useMemoryWorkspace";

type Workspace = ReturnType<typeof useMemoryWorkspace>;
type Props = { workspace: Workspace };

export function MemoryFiltersPanel({ workspace }: Props) {
    const { memoryLevel, setMemoryLevel, setOffset, setSearchResults, projectId, setProjectId, projects, agentId, setAgentId, searchQuery, setSearchQuery, searchMutation, searchResults } = workspace;
    return (
                <SectionCard title="Filters & search" description="Scope by level, project, and agent.">
                    <div className="flex gap-4">
                        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                            <FormField
                                as="select"
                                label="Memory level"
                                value={memoryLevel}
                                onChange={(e: any) => {
                                    setMemoryLevel(e.target.value);
                                    setOffset(0);
                                    setSearchResults(null);
                                }}>
                                <option value="">All levels</option>
                                {MEMORY_LEVELS.map((level) => (
                                    <option key={level}>
                                        {level}
                                    </option>
                                ))}
                            </FormField>
                            {workspace.projectsEnabled && <FormField
                                as="select"
                                label="Project"
                                value={projectId}
                                onChange={(e: any) => {
                                    setProjectId(e.target.value);
                                    setOffset(0);
                                    setSearchResults(null);
                                }}>
                                <option value="">All projects</option>
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </FormField>}
                            <FormField
                                label="Agent ID"
                                value={agentId}
                                onChange={(e: any) => {
                                    setAgentId(e.target.value);
                                    setOffset(0);
                                    setSearchResults(null);
                                }} />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <FormField
                                label="Search query"
                                value={searchQuery}
                                onChange={(e: any) => setSearchQuery(e.target.value)} />
                            <Button
                                variant="default"
                                disabled={!searchQuery.trim() || searchMutation.isPending}
                                onClick={() => searchMutation.mutate()}
                                type="button"
                            ><SearchIcon />Search
                                                            </Button>
                            {searchResults ? (
                                <Button variant="outline" onClick={() => setSearchResults(null)} type="button">
                                    Clear search
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </SectionCard>
    );
}
