import {Button} from "@/components/ui/button";
import {FormField} from "@/components/ui/form-field";
import {Sparkles} from "lucide-react";
import {EmptyState} from "../../components/Feedback";
import {SectionCard} from "../../components/Section";
import type {AiStudioModel} from "./useAiStudioView";
import {Badge} from "@/components/ui/badge";

export function PromptLibraryPanel({m}: { m: AiStudioModel }) {
    const {
        templateForm,
        setTemplateForm,
        createTemplateMutation,
        promptTemplates,
        setSelectedTemplateId,
        selectedTemplateId
    } = m;
    return (
        <SectionCard title="Prompt library"
                     description="Create reusable prompt templates and publish versioned variants with rollout and pricing metadata.">
            <div className="flex gap-ui-md">
                <div className="flex flex-col md:flex-row gap-ui-sm">
                    <FormField
                        label="Template key"
                        value={templateForm.key}
                        onChange={(event: any) => setTemplateForm((current) => ({
                            ...current,
                            key: event.target.value
                        }))}/>
                    <FormField
                        label="Name"
                        value={templateForm.name}
                        onChange={(event: any) => setTemplateForm((current) => ({
                            ...current,
                            name: event.target.value
                        }))}/>
                </div>
                <FormField
                    label="Description"
                    value={templateForm.description}
                    onChange={(event: any) => setTemplateForm((current) => ({
                        ...current,
                        description: event.target.value
                    }))}
                    as="textarea"
                    rows={2}/>
                <Button
                    variant="default"
                    onClick={() => createTemplateMutation.mutate(templateForm)}
                    disabled={createTemplateMutation.isPending || !templateForm.key.trim() || !templateForm.name.trim()}
                    type="button">
                    {createTemplateMutation.isPending ? "Creating..." : "Create prompt template"}
                </Button>
                {promptTemplates.length > 0 ? (
                    <div className="flex gap-ui-sm">
                        {promptTemplates.map((template) => (
                            <div key={template.id} className="surface-card ui-feature-surface">
                                <div className="flex gap-ui-xs">
                                    <div className="flex flex-col sm:flex-row gap-ui-xs justify-between">
                                        <div>
                                            <p>{template.name}</p>
                                            <p className="text-muted-foreground">
                                                {template.key}
                                            </p>
                                        </div>
                                        <div className="flex flex-row gap-ui-xs flex-wrap">
                                            {template.is_active && (
                                                <Badge variant="success">active</Badge>
                                            )}

                                            {template.active_version_id && (
                                                <Badge variant="outline">version pinned</Badge>
                                            )}
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
                        icon={<Sparkles/>}
                        title="No prompts yet"
                        description="Create your first prompt template to start building reusable AI behaviors."
                    />
                )}
            </div>
        </SectionCard>
    );
}
