import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import type { PlatformConfig } from "../../../api/platform";
import { SectionCard } from "../../../components/ui/SectionCard";
import { getQueryErrorMessage } from "../../../utils/queryErrors";
import type { PlatformAdminModel } from "../hooks/usePlatformAdminContent";

export function CloneConfigSection({ source, model }: { source: PlatformConfig; model: PlatformAdminModel }) {
    const draft = model.configDraft;
    const set = model.setConfigDraft;
    const activePack = source.available_module_packs.find((pack) => pack.key === draft.module_pack);
    return (
        <SectionCard title="Clone configuration" description="Set the product name, core domain terminology, module pack, and module visibility defaults."
            action={<Button
                variant="default"
                disabled={model.saveConfigMutation.isPending}
                onClick={() => model.saveConfigMutation.mutate({ app_name: draft.app_name, core_domain_singular: draft.core_domain_singular,
                    core_domain_plural: draft.core_domain_plural, module_pack: draft.module_pack, module_overrides: draft.module_states, mfa_enabled: draft.mfa_enabled })}
                type="button">
                {model.saveConfigMutation.isPending ? "Saving..." : "Save platform config"}</Button>}>
            <div className="flex gap-[20px]">
                {model.saveConfigMutation.isError && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{getQueryErrorMessage(model.saveConfigMutation.error, "Failed to save platform config.")}</div>}
                <FormField
                    label="App name"
                    value={draft.app_name}
                    onChange={(e: any) => set((v) => ({ ...v, app_name: e.target.value }))} />
                <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
                    <FormField
                        label="Core domain singular"
                        value={draft.core_domain_singular}
                        onChange={(e: any) => set((v) => ({ ...v, core_domain_singular: e.target.value }))} />
                    <FormField
                        label="Core domain plural"
                        value={draft.core_domain_plural}
                        onChange={(e: any) => set((v) => ({ ...v, core_domain_plural: e.target.value }))} />
                </div>
                <FormField
                    label="Module pack"
                    as="select"
                    value={draft.module_pack}
                    onChange={(e: any) => {
                        const module_pack = e.target.value;
                        const defaults = source.available_module_packs.find((pack) => pack.key === module_pack)?.modules ?? [];
                        set((v) => ({ ...v, module_pack, module_states: Object.fromEntries(source.module_catalog.map((item) => [item.key, defaults.includes(item.key)])) }));
                    }}>{source.available_module_packs.map((pack) => <option key={pack.key}>{pack.label}</option>)}</FormField>
                {activePack && <div role="alert" className="rounded-lg border border-border p-3 text-sm">{activePack.description}</div>}
                <div style={({
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${"var(--border)"}`
                })}>
                    <div className="flex flex-row gap-[12px] justify-between"><div><p>MFA authentication</p><p className="text-muted-foreground">Show the authenticator code field on the login page.</p></div>
                        <input
                            checked={draft.mfa_enabled}
                            onChange={(e: any) => set((v) => ({ ...v, mfa_enabled: e.target.checked }))}
                            type="checkbox"
                            role="switch" /></div>
                </div>
                <div><p style={{ marginBottom: 10 }}>Module access</p>
                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr" }}>
                        {source.module_catalog.map((item) => <div key={item.key} style={({
                            padding: 16,
                            borderRadius: 16,
                            border: `1px solid ${"var(--border)"}`
                        })}>
                            <div className="flex flex-row gap-[12px] justify-between"><div><p>{item.label}</p><p className="text-muted-foreground">{item.description}</p></div>
                                <input
                                    checked={draft.module_states[item.key] ?? false}
                                    onChange={(e: any) => set((v) => ({ ...v, module_states: { ...v.module_states, [item.key]: e.target.checked } }))}
                                    type="checkbox"
                                    role="switch" /></div>
                        </div>)}
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}
