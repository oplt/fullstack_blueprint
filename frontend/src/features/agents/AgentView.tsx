import { useEffect, useMemo, useState } from "react";
import { usePlatformMetadata } from "../platform/hooks";
import { PageHeader } from "../../components/PageLayout";
import { PageShell } from "../../components/PageLayout";
import { PageTabs, TabsPanel } from "../../components/PageLayout";
import { SettingsTabs } from "../../app/SettingsTabs";
import { useTabQueryParam } from "../../app/searchParams";
import { useAgentWorkspace } from "./useAgentWorkspace";
import { AgentConfigurationPanel } from "./AgentConfigurationPanel";
import { AgentRunPanel } from "./AgentRunPanel";
import { AgentRunDetails } from "./AgentRunDetails";
import { buildAgentTraceSteps } from "./agentTraceModel";
import { useApplicationConfiguration } from "../../app/configuration";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "../../lib/capabilities";

const AGENT_TABS = ["configure", "run", "trace", "sources", "output"] as const;

export default function AgentView() {
    const { data: platform } = usePlatformMetadata();
    const configuration = useApplicationConfiguration();
    const serverState = serverStateFromPlatformMetadata(platform);
    const ragEnabled = capabilityAvailability("rag", configuration, serverState).available;
    const projectsEnabled = capabilityAvailability("projects", configuration, serverState).available;

    const [agentId, setAgentId] = useState("default");
    const [projectId, setProjectId] = useState("");
    const [userMessage, setUserMessage] = useState("");
    const [promptTemplateKey, setPromptTemplateKey] = useState("");
    const [retrievalQuery, setRetrievalQuery] = useState("");
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
    const [topK, setTopK] = useState(4);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [tab, setTab] = useTabQueryParam(AGENT_TABS, "configure");
    const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
    const [elapsedMs, setElapsedMs] = useState(0);

    const {
        projectsQuery, documentsQuery, templates, providers,
        selectedTemplate, runsQuery, selectedRunQuery, runMutation,
    } = useAgentWorkspace({
        agentId, projectId, userMessage, promptTemplateKey, retrievalQuery,
        selectedDocumentIds, topK, selectedRunId, ragEnabled, activeTab: tab, setTab,
        setRunStartedAt, setElapsedMs, setSelectedRunId, projectsEnabled,
    });

    useEffect(() => {
        if (!runMutation.isPending || runStartedAt == null) return;
        const tick = window.setInterval(() => {
            setElapsedMs(Date.now() - runStartedAt);
        }, 200);
        return () => window.clearInterval(tick);
    }, [runMutation.isPending, runStartedAt]);

    const history = runsQuery.data?.items ?? [];
    const selectedRun = selectedRunQuery.data ?? null;
    const traceSteps = useMemo(
        () => (selectedRun ? buildAgentTraceSteps(selectedRun) : []),
        [selectedRun]
    );

    function toggleDocument(id: string) {
        setSelectedDocumentIds((ids) =>
            ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
        );
    }

    return (
        <PageShell width="wide">
            <PageHeader
                title="AI Agent"
                description="Transparent agent runs: configure tools and retrieval, watch progress, inspect structured trace and sources, then read the final output separately."
            />
            <SettingsTabs />

            <PageTabs
                value={tab}
                onChange={setTab}
                tabs={[
                    { value: "configure", label: "Configure" },
                    { value: "run", label: "Run" },
                    { value: "trace", label: "Trace" },
                    { value: "sources", label: "Sources" },
                    { value: "output", label: "Output" },
                ]}
                ariaLabel="Agent workflow"
                className="mt-ui-md"
            >
                <TabsPanel value="configure">
                <AgentConfigurationPanel
                    active={tab === "configure"}
                    agentId={agentId}
                    setAgentId={setAgentId}
                    projectId={projectId}
                    setProjectId={setProjectId}
                    userMessage={userMessage}
                    setUserMessage={setUserMessage}
                    promptTemplateKey={promptTemplateKey}
                    setPromptTemplateKey={setPromptTemplateKey}
                    retrievalQuery={retrievalQuery}
                    setRetrievalQuery={setRetrievalQuery}
                    selectedDocumentIds={selectedDocumentIds}
                    toggleDocument={toggleDocument}
                    clearSelectedDocuments={() => setSelectedDocumentIds([])}
                    topK={topK}
                    setTopK={setTopK}
                    ragEnabled={ragEnabled}
                    projectsEnabled={projectsEnabled}
                    projectsQuery={projectsQuery}
                    documentsQuery={documentsQuery}
                    templates={templates}
                    providers={providers}
                    selectedTemplate={selectedTemplate}
                    onContinue={() => setTab("run")}
                />
                </TabsPanel>
                <TabsPanel value="run">
                <AgentRunPanel
                    active={tab === "run"}
                    history={history}
                    runsQuery={runsQuery}
                    runMutation={runMutation}
                    selectedRun={selectedRun}
                    selectedRunId={selectedRunId}
                    setSelectedRunId={setSelectedRunId}
                    setTab={setTab}
                    userMessage={userMessage}
                    elapsedMs={elapsedMs}
                />
                </TabsPanel>
                {(["trace", "sources", "output"] as const).map((detailTab) => (
                    <TabsPanel key={detailTab} value={detailTab}>
                        {tab === detailTab ? <AgentRunDetails
                    tab={detailTab}
                    selectedRunId={selectedRunId}
                    selectedRunQuery={selectedRunQuery}
                    selectedRun={selectedRun}
                    traceSteps={traceSteps}
                    setTab={setTab}
                /> : null}
                    </TabsPanel>
                ))}
            </PageTabs>
        </PageShell>
    );
}
