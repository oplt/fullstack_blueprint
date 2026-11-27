import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { HelpTooltip } from "../../../components/ui/HelpTooltip";
import { Badge } from "../../../components/ui/badge";
import { KeyValueList } from "../../../components/ui/KeyValueList";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { useAgentWorkspace } from "../hooks/useAgentWorkspace";
import { AgentRetrievalSettings } from "./AgentRetrievalSettings";

type AgentWorkspace = ReturnType<typeof useAgentWorkspace>;

type Props = {
    active: boolean;
    agentId: string; setAgentId: (value: string) => void;
    projectId: string; setProjectId: (value: string) => void;
    userMessage: string; setUserMessage: (value: string) => void;
    promptTemplateKey: string; setPromptTemplateKey: (value: string) => void;
    retrievalQuery: string; setRetrievalQuery: (value: string) => void;
    selectedDocumentIds: string[]; toggleDocument: (id: string) => void;
    clearSelectedDocuments: () => void;
    topK: number; setTopK: (value: number) => void; ragEnabled: boolean;
    projectsEnabled: boolean;
    projectsQuery: AgentWorkspace["projectsQuery"];
    documentsQuery: AgentWorkspace["documentsQuery"];
    templates: AgentWorkspace["templates"]; providers: AgentWorkspace["providers"];
    selectedTemplate: AgentWorkspace["selectedTemplate"]; onContinue: () => void;
};

function AgentProjectField({
    enabled, projectId, projectsQuery, clearSelectedDocuments, setProjectId,
}: {
    enabled: boolean;
    projectId: string;
    projectsQuery: AgentWorkspace["projectsQuery"];
    clearSelectedDocuments: () => void;
    setProjectId: (value: string) => void;
}) {
    if (!enabled) return null;
    return (
        <FormField
            as="select"
            label="Project"
            value={projectId}
            onChange={(event: any) => {
                setProjectId(event.target.value);
                clearSelectedDocuments();
            }}
        >
            <option value="">None</option>
            {(projectsQuery.data ?? []).map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
            ))}
        </FormField>
    );
}

export function AgentConfigurationPanel(props: Props) {
    const { active, agentId, setAgentId, projectId, setProjectId, userMessage, setUserMessage, promptTemplateKey, setPromptTemplateKey, retrievalQuery, setRetrievalQuery, selectedDocumentIds, toggleDocument, clearSelectedDocuments, topK, setTopK, ragEnabled, projectsEnabled, projectsQuery, documentsQuery, templates, providers, selectedTemplate, onContinue } = props;
    if (!active) return null;
    const enabledTools = [
        { id: "generate", label: "Generate", enabled: true },
        {
            id: "retrieve",
            label: "RAG retrieve",
            enabled: ragEnabled && Boolean(retrievalQuery.trim() || userMessage.trim() || selectedDocumentIds.length),
        },
        { id: "memory", label: "Memory link", enabled: true },
    ];
    return (
                
                    <SectionCard
                        title="Configure"
                        description="Model, tools, prompt, limits, and retrieval — then continue to Run."
                    >
                        <div className="flex gap-ui-md">
                            <div role="alert" className="rounded-lg border border-border p-ui-sm text-body-md">
                                Execution is synchronous today (HTTP 201). The Run tab shows live
                                status until the backend responds or times out.
                            </div>

                            <p>
                                <HelpTooltip termId="model_family" variant="label">
                                    Model
                                </HelpTooltip>
                            </p>
                            <KeyValueList
                                showHelp
                                items={[
                                    {
                                        key: "agent_id",
                                        label: "Agent ID",
                                        value: agentId || "default",
                                    },
                                    {
                                        key: "providers",
                                        label: "Available providers",
                                        value: providers.length
                                            ? providers
                                                  .map((p) => `${p.label} (${p.key})`)
                                                  .join(", ")
                                            : "—",
                                        helpTermId: "model_family",
                                    },
                                    {
                                        key: "prompt_template",
                                        label: "Prompt template",
                                        value: selectedTemplate
                                            ? `${selectedTemplate.name} (${selectedTemplate.key})`
                                            : "Message only (no template)",
                                    },
                                ]}
                            />

                            <div className="flex flex-col sm:flex-row gap-ui-md flex-wrap">
                                <FormField
                                    label="Agent ID"
                                    value={agentId}
                                    onChange={(e: any) => setAgentId(e.target.value)} />
                                <AgentProjectField
                                    enabled={projectsEnabled}
                                    projectId={projectId}
                                    projectsQuery={projectsQuery}
                                    clearSelectedDocuments={clearSelectedDocuments}
                                    setProjectId={setProjectId}
                                />
                                <FormField
                                    as="select"
                                    label="Prompt template"
                                    value={promptTemplateKey}
                                    onChange={(e: any) => setPromptTemplateKey(e.target.value)}>
                                    <option>None (message only)</option>
                                    {templates.map((template) => (
                                        <option key={template.id}>
                                            {template.name} ({template.key})
                                        </option>
                                    ))}
                                </FormField>
                            </div>

                            <div>
                                <p>
                                    <HelpTooltip termId="agent_tools" variant="label">
                                        Tools
                                    </HelpTooltip>
                                </p>
                                <div className="flex flex-row gap-ui-xs flex-wrap">
                                    {enabledTools.map((tool) => (
                                        <Badge key={tool.id} variant="outline">
                                            {tool.label}: {tool.enabled ? "enabled" : "disabled"}
                                        </Badge>
                                    ))}
                                </div>
                                <span className="mt-1 text-muted-foreground">
                                    Enabled tools appear as structured steps on the Trace tab after a
                                    run.
                                </span>
                            </div>

                            <p>Prompt</p>
                            <FormField
                                label="User message"
                                value={userMessage}
                                onChange={(e: any) => setUserMessage(e.target.value)}
                                as="textarea"
                                rows={3} />

                            {ragEnabled ? (
                                <AgentRetrievalSettings
                                    topK={topK}
                                    setTopK={setTopK}
                                    retrievalQuery={retrievalQuery}
                                    setRetrievalQuery={setRetrievalQuery}
                                    documentsQuery={documentsQuery}
                                    selectedDocumentIds={selectedDocumentIds}
                                    toggleDocument={toggleDocument}
                                />
                            ) : null}
                            <Button
                                variant="default"
                                onClick={onContinue}
                                disabled={!userMessage.trim()}
                                type="button">
                                Continue to Run
                            </Button>
                        </div>
                    </SectionCard>
                
    );
}
