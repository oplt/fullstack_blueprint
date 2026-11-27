import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import { Sparkles as PromptIcon } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { AiStudioModel } from "../hooks/useAiStudioView";

export function PromptLibraryPanel({ m }: { m: AiStudioModel }) {
    const { templateForm, setTemplateForm, createTemplateMutation, promptTemplates, setSelectedTemplateId, selectedTemplateId } = m;
    return (
        <SectionCard title="Prompt library" description="Create reusable prompt templates and publish versioned variants with rollout and pricing metadata.">
            <div className="flex gap-ui-md">
                <div className="flex flex-col md:flex-row gap-ui-sm">
                    <FormField
                        label="Template key"
                        value={templateForm.key}
                        onChange={(event: any) => setTemplateForm((current) => ({ ...current, key: event.target.value }))} />
                    <FormField
                        label="Name"
                        value={templateForm.name}
                        onChange={(event: any) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <FormField
                    label="Description"
                    value={templateForm.description}
                    onChange={(event: any) => setTemplateForm((current) => ({ ...current, description: event.target.value }))}
                    as="textarea"
                    rows={2} />
                <Button
                    variant="default"
                    onClick={() => createTemplateMutation.mutate(templateForm)}
                    disabled={createTemplateMutation.isPending || !templateForm.key.trim() || !templateForm.name.trim()}
                    type="button">
                    {createTemplateMutation.isPending ? "Creating..." : "Create prompt template"}
                </Button>
                {promptTemplates.length > 0 ? (
                    <div className="flex ui-auto-prompt-library-panel-div">
                        {promptTemplates.map((template) => (
                            <div key={template.id} style={({
                                padding: 16,
                                borderRadius: 16,
                                border: `1px solid ${"var(--border)"}`
                            })}>
                                <div className="flex gap-ui-xs">
                                    <div className="flex flex-col sm:flex-row justify-between gap-ui-xs">
                                        <div>
                                            <p>{template.name}</p>
                                            <p className="text-muted-foreground">
                                                {template.key}
                                            </p>
                                        </div>
                                        <div className="flex flex-row flex-wrap gap-ui-xs">
                                            {template.is_active && <div
                                                className="inline-flex items-center ui-auto-prompt-library-panel-div-7c6ee7c" />}
                                            {template.active_version_id && <div
                                                className="inline-flex items-center ui-auto-prompt-library-panel-div-7c6ee7c-x" />}
                                        </div>
                                    </div>
                                    {template.description && (
                                        <p className="text-muted-foreground">
                                            {template.description}
                                        </p>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={() => setSelectedTemplateId(template.id)}
                                        type="button">
                                        {selectedTemplateId === template.id ? "Selected" : "Manage versions"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={<PromptIcon />}
                        title="No prompts yet"
                        description="Create your first prompt template to start building reusable AI behaviors."
                    />
                )}
            </div>
        </SectionCard>
    );
}
