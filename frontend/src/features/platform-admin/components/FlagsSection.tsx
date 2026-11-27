import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { Switch } from "@/components/ui/switch";
import type { FeatureFlag } from "../../../api/platform/featureFlags";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { PlatformAdminModel } from "../hooks/usePlatformAdminContent";

export function FlagsSection({ flags, model }: { flags: FeatureFlag[]; model: PlatformAdminModel }) {
    const n = model.newFlag;
    return (
        <SectionCard title="Feature flags" description="Create rollout controls and tune existing flags."><div className="flex gap-6">
                                <div className="surface-card ui-feature-surface"><div className="flex gap-3"><p>Create flag</p>
                                    <div className="gap-3" style={{ display: "grid", gridTemplateColumns: "1fr" }}>
                                        <FormField label="Key" value={n.key} onChange={(e: any) => model.setNewFlag((v) => ({ ...v, key: e.target.value }))} /><FormField label="Name" value={n.name} onChange={(e: any) => model.setNewFlag((v) => ({ ...v, name: e.target.value }))} />
                                        <FormField label="Module key" value={n.module_key} onChange={(e: any) => model.setNewFlag((v) => ({ ...v, module_key: e.target.value }))} /><FormField label="Rollout %" value={n.rollout_percentage} onChange={(e: any) => model.setNewFlag((v) => ({ ...v, rollout_percentage: e.target.value }))} />
                                    </div><FormField label="Description" value={n.description} onChange={(e: any) => model.setNewFlag((v) => ({ ...v, description: e.target.value }))} /><Switch
                                        aria-label="Enable new feature flag"
                                        checked={n.is_enabled}
                                        onCheckedChange={(checked) => model.setNewFlag((v) => ({ ...v, is_enabled: checked }))}
                                    />
                                    <Button
                                        variant="default"
                                        disabled={model.createFlagMutation.isPending || n.key.trim().length < 2}
                                        onClick={() => model.createFlagMutation.mutate({ key: n.key.trim(), name: n.name.trim(), description: n.description.trim() || undefined, module_key: n.module_key.trim() || null, is_enabled: n.is_enabled, rollout_percentage: Number(n.rollout_percentage) })}
                                        type="button">{model.createFlagMutation.isPending ? "Creating..." : "Create flag"}</Button>
                                </div></div>
                                <div className="flex gap-3">{flags.map((flag) => { const d = model.flagDrafts[flag.id]; const saving = model.updateFlagMutation.isPending && model.updateFlagMutation.variables?.id === flag.id; return (
                                    <div key={flag.id} className="surface-card ui-feature-surface"><div className="flex gap-3"><p>{flag.key}</p>
                                                            <div className="gap-3" style={{ display: "grid", gridTemplateColumns: "1fr" }}><FormField label="Name" value={d.name} onChange={(e: any) => model.setFlagDrafts((v) => ({ ...v, [flag.id]: { ...d, name: e.target.value } }))} /><FormField label="Module key" value={d.module_key} onChange={(e: any) => model.setFlagDrafts((v) => ({ ...v, [flag.id]: { ...d, module_key: e.target.value } }))} /><FormField label="Rollout %" value={d.rollout_percentage} onChange={(e: any) => model.setFlagDrafts((v) => ({ ...v, [flag.id]: { ...d, rollout_percentage: e.target.value } }))} /></div>
                                                            <FormField label="Description" value={d.description} onChange={(e: any) => model.setFlagDrafts((v) => ({ ...v, [flag.id]: { ...d, description: e.target.value } }))} /><Switch
                                                                aria-label={`Enable feature flag ${flag.key}`}
                                                                checked={d.is_enabled}
                                                                onCheckedChange={(checked) => model.setFlagDrafts((v) => ({ ...v, [flag.id]: { ...d, is_enabled: checked } }))}
                                                            /><Button
                                                            variant="outline"
                                                            disabled={saving}
                                                            onClick={() => model.updateFlagMutation.mutate({ id: flag.id, draft: d })}
                                                            type="button">{saving ? "Saving..." : "Save flag"}</Button>
                                                        </div></div>
                                ); })}</div>
                            </div></SectionCard>
    );
}
