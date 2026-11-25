import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import { QueryErrorAlert } from "../../../components/ui/QueryBoundary";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { AiStudioModel } from "../hooks/useAiStudioView";
import { firstSchemaError, promptVersionDraftSchema } from "../studioUtils";

export function VersionBuilderPanel({ m }: { m: AiStudioModel }) {
    const { selectedTemplateId, setSelectedTemplateId, promptTemplates, versionForm, setVersionForm, providers, createVersionMutation, parseVariableDefinitions, versionsIsError, versionsError, refetchVersions, versionsLoading, selectedTemplateVersions, activateVersionMutation, publishVersionMutation } = m;
    return (
        <SectionCard title="Version builder" description="Attach deployable versions to a prompt template with model selection, rollout state, and provider pricing.">
            <div className="flex gap-[16px]">
                <FormField
                    as="select"
                    label="Selected template"
                    value={selectedTemplateId}
                    onChange={(event: any) => setSelectedTemplateId(event.target.value)}>
                    {promptTemplates.map((template) => (
                        <option key={template.id}>
                            {template.name}
                        </option>
                    ))}
                </FormField>
                <FormField
                    as="select"
                    label="Provider"
                    value={versionForm.provider_key}
                    onChange={(event: any) => setVersionForm((current) => ({ ...current, provider_key: event.target.value }))}>
                    {providers.map((provider) => (
                        <option key={provider.key}>
                            {provider.label}
                        </option>
                    ))}
                </FormField>
                <FormField
                    label="Model name"
                    value={versionForm.model_name}
                    onChange={(event: any) => setVersionForm((current) => ({ ...current, model_name: event.target.value }))} />
                <FormField
                    label="System prompt"
                    value={versionForm.system_prompt}
                    onChange={(event: any) => setVersionForm((current) => ({ ...current, system_prompt: event.target.value }))}
                    as="textarea"
                    rows={3} />
                <FormField
                    label="User prompt template"
                    value={versionForm.user_prompt_template}
                    onChange={(event: any) => setVersionForm((current) => ({ ...current, user_prompt_template: event.target.value }))}
                    as="textarea"
                    rows={5} />
                <FormField
                    label="Variable names (comma separated)"
                    value={versionForm.variable_names}
                    onChange={(event: any) => setVersionForm((current) => ({ ...current, variable_names: event.target.value }))} />
                <div className="flex flex-col sm:flex-row gap-[12px]">
                    <FormField
                        as="select"
                        label="Response format"
                        value={versionForm.response_format}
                        onChange={(event: any) => setVersionForm((current) => ({ ...current, response_format: event.target.value as "text" | "json" }))}>
                        <option>Text</option>
                        <option>JSON</option>
                    </FormField>
                    <FormField
                        label="Temperature"
                        value={versionForm.temperature}
                        onChange={(event: any) => setVersionForm((current) => ({ ...current, temperature: event.target.value }))} />
                </div>
                <div className="flex flex-col sm:flex-row gap-[12px]">
                    <FormField
                        label="Rollout %"
                        value={versionForm.rollout_percentage}
                        onChange={(event: any) => setVersionForm((current) => ({ ...current, rollout_percentage: event.target.value }))} />
                    <label><input
                            checked={versionForm.is_published}
                            onChange={(event: any) => setVersionForm((current) => ({ ...current, is_published: event.target.checked }))}
                            type="checkbox"
                            role="switch" /></label>
                </div>
                <div className="flex flex-col sm:flex-row gap-[12px]">
                    <FormField
                        label="Input cost / million"
                        value={versionForm.input_cost_per_million}
                        onChange={(event: any) => setVersionForm((current) => ({ ...current, input_cost_per_million: event.target.value }))} />
                    <FormField
                        label="Output cost / million"
                        value={versionForm.output_cost_per_million}
                        onChange={(event: any) => setVersionForm((current) => ({ ...current, output_cost_per_million: event.target.value }))} />
                </div>
                <Button
                    variant="default"
                    disabled={createVersionMutation.isPending || !selectedTemplateId || !versionForm.model_name.trim() || !versionForm.user_prompt_template.trim()}
                    onClick={() => {
                        const result = promptVersionDraftSchema.safeParse(versionForm);
                        if (!result.success) {
                            m.showToast({ message: firstSchemaError(result), severity: "error" });
                            return;
                        }
                        createVersionMutation.mutate({
                            templateId: selectedTemplateId,
                            payload: {
                                provider_key: result.data.provider_key,
                                model_name: result.data.model_name,
                                system_prompt: result.data.system_prompt,
                                user_prompt_template: result.data.user_prompt_template,
                                variable_definitions: parseVariableDefinitions(result.data.variable_names),
                                response_format: result.data.response_format,
                                temperature: Number(result.data.temperature),
                                rollout_percentage: Number(result.data.rollout_percentage),
                                is_published: result.data.is_published,
                                input_cost_per_million: Number(result.data.input_cost_per_million),
                                output_cost_per_million: Number(result.data.output_cost_per_million),
                            },
                        });
                    }}
                    type="button">
                    {createVersionMutation.isPending ? "Saving..." : "Create prompt version"}
                </Button>
                {selectedTemplateId && versionsIsError && (
                    <QueryErrorAlert
                        error={versionsError}
                        fallback="Failed to load prompt versions."
                        onRetry={() => void refetchVersions()}
                    />
                )}
                {selectedTemplateId && versionsLoading ? (
                    <div className="flex gap-[10px]">
                        {Array.from({ length: 2 }).map((_: any, index: any) => (
                            <div
                                key={index}
                                style={{ borderRadius: 12 }}
                                className="animate-pulse rounded-md bg-muted" />
                        ))}
                    </div>
                ) : selectedTemplateVersions.length > 0 ? (
                    <div className="flex gap-[10px]">
                        {selectedTemplateVersions.map((version) => (
                            <div key={version.id} style={({
                                padding: 16,
                                borderRadius: 16,
                                border: `1px solid ${"var(--border)"}`
                            })}>
                                <div className="flex gap-[8px]">
                                    <div className="flex flex-col sm:flex-row gap-[8px] justify-between">
                                        <p>
                                            v{version.version_number} • {version.provider_key}/{version.model_name}
                                        </p>
                                        <div className="flex flex-row gap-[8px] flex-wrap">
                                            {version.is_published && <div
                                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />}
                                            <div
                                                className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs" />
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground">
                                        {version.user_prompt_template.slice(0, 180)}
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-[8px]">
                                        <Button
                                            variant="outline"
                                            onClick={() => activateVersionMutation.mutate({ templateId: selectedTemplateId, versionId: version.id })}
                                            type="button">
                                            Set active
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => publishVersionMutation.mutate({ templateId: selectedTemplateId, versionId: version.id, isPublished: !version.is_published })}
                                            type="button">
                                            {version.is_published ? "Unpublish" : "Publish"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </SectionCard>
    );
}
