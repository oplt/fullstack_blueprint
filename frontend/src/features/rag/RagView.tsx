import { useRef } from "react";
import { FormField } from "../../components/ui/form-field";
import { PageHeader } from "../../components/PageLayout";
import { PageShell } from "../../components/PageLayout";
import { PageTabs, TabsPanel } from "../../components/PageLayout";
import { SettingsTabs } from "../../app/SettingsTabs";
import { useTabQueryParam } from "../../app/searchParams";
import { useRagWorkspace } from "./useRagWorkspace";
import { RagDocumentsPanel } from "./RagDocumentsPanel";
import { RagIndexingPanel } from "./RagIndexingPanel";
import { RagRetrievalPanel } from "./RagRetrievalPanel";
import { RagEvaluationPanel } from "./RagEvaluationPanel";
import { RagRunsPanel } from "./RagRunsPanel";

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

            <div className="mt-ui-md flex flex-col gap-ui-md">
                <div
                    className="flex flex-col sm:flex-row gap-ui-sm sm:items-center justify-between">
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
                    className="mb-0"
                >
                    <TabsPanel value="documents">
                        <RagDocumentsPanel workspace={workspace} fileInputRef={fileInputRef} onTabChange={setTab} />
                    </TabsPanel>
                    <TabsPanel value="indexing">
                        <RagIndexingPanel workspace={workspace} onTabChange={setTab} />
                    </TabsPanel>
                    <TabsPanel value="retrieval"><RagRetrievalPanel workspace={workspace} /></TabsPanel>
                    <TabsPanel value="evaluation"><RagEvaluationPanel workspace={workspace} /></TabsPanel>
                    <TabsPanel value="runs"><RagRunsPanel workspace={workspace} /></TabsPanel>
                </PageTabs>
            </div>
        </PageShell>
    );
}
