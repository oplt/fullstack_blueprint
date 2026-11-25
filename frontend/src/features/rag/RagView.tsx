import { useRef } from "react";
import { FormField } from "../../components/ui/form-field";
import { PageHeader } from "../../components/ui/PageHeader";
import { PageShell } from "../../components/ui/PageShell";
import { PageTabs } from "../../components/ui/PageTabs";
import { SettingsTabs } from "../../components/layout/SettingsTabs";
import { useTabQueryParam } from "../../hooks/useTabQueryParam";
import { useRagWorkspace } from "./hooks/useRagWorkspace";
import { RagDocumentsPanel } from "./components/RagDocumentsPanel";
import { RagIndexingPanel } from "./components/RagIndexingPanel";
import { RagRetrievalPanel } from "./components/RagRetrievalPanel";
import { RagEvaluationPanel } from "./components/RagEvaluationPanel";
import { RagRunsPanel } from "./components/RagRunsPanel";

const RAG_TABS = ["documents", "indexing", "retrieval", "evaluation", "runs"] as const;

export default function RagView() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tab, setTab] = useTabQueryParam(RAG_TABS, "documents");
    const workspace = useRagWorkspace(tab, setTab);

    return (
        <PageShell width="wide">
            <PageHeader
                title="RAG workspace"
                description="Manage documents and inspect indexing, retrieval, and evaluation."
            />
            <SettingsTabs />

            <div className="mt-4 flex gap-4">
                <div
                    className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                    <p className="text-muted-foreground">
                        Optionally limit documents and retrieval to one project.
                    </p>
                    {workspace.projectsEnabled && <FormField
                        as="select"
                        label="Project / index scope"
                        value={workspace.projectId}
                        onChange={(e: any) => {
                            workspace.setProjectId(e.target.value);
                            workspace.setDocOffset(0);
                            workspace.setSelectedDocumentId(null);
                        }}>
                        <option value="">All projects</option>
                        {(workspace.projectsQuery.data ?? []).map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </FormField>}
                </div>

                <PageTabs
                    value={tab}
                    onChange={setTab}
                    tabs={[
                        { value: "documents", label: "Documents" },
                        { value: "indexing", label: "Indexing" },
                        { value: "retrieval", label: "Retrieval" },
                        { value: "evaluation", label: "Evaluation" },
                        { value: "runs", label: "Runs" },
                    ]}
                    ariaLabel="RAG workspace"
                />

                <RagDocumentsPanel workspace={workspace} fileInputRef={fileInputRef} onTabChange={setTab} />
                <RagIndexingPanel workspace={workspace} onTabChange={setTab} />
                <RagRetrievalPanel workspace={workspace} />
                <RagEvaluationPanel workspace={workspace} />
                <RagRunsPanel workspace={workspace} />
            </div>
        </PageShell>
    );
}
