import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";import { Badge } from "@/components/ui/badge";import { Switch } from "@/components/ui/switch";
import type { SubscriptionPlan } from "../../../api/platform/billing";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { PlatformAdminModel } from "../hooks/usePlatformAdminContent";

export function PlansSection({ plans, model }: { plans: SubscriptionPlan[]; model: PlatformAdminModel }) {
    const create = model.newPlan;
    return (
        <SectionCard title="Subscription plans" description="Create new commercial tiers and tune existing plans."><div className="flex gap-[20px]">
                                <div style={({
                                    padding: 20,
                                    borderRadius: 16,
                                    border: `1px solid ${"var(--border)"}`
                                })}><div className="flex gap-3">
                                    <p>Create plan</p>
                                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
                                        <FormField label="Code" value={create.code} onChange={(e: any) => model.setNewPlan((v) => ({ ...v, code: e.target.value }))} />
                                        <FormField label="Name" value={create.name} onChange={(e: any) => model.setNewPlan((v) => ({ ...v, name: e.target.value }))} />
                                        <FormField label="Price (cents)" value={create.price_cents} onChange={(e: any) => model.setNewPlan((v) => ({ ...v, price_cents: e.target.value }))} />
                                        <FormField label="Interval" value={create.interval} onChange={(e: any) => model.setNewPlan((v) => ({ ...v, interval: e.target.value }))} />
                                    </div>
                                    <FormField label="Description" value={create.description} onChange={(e: any) => model.setNewPlan((v) => ({ ...v, description: e.target.value }))} />
                                    <FormField label="Features" value={create.features} onChange={(e: any) => model.setNewPlan((v) => ({ ...v, features: e.target.value }))} description="Comma-separated feature labels" />
                                    <Switch
                                        aria-label="Make new plan the default"
                                        checked={create.is_default}
                                        onCheckedChange={(checked) => model.setNewPlan((v) => ({ ...v, is_default: checked }))}
                                    />
                                    <Button
                                        variant="default"
                                        disabled={model.createPlanMutation.isPending || create.code.trim().length < 2}
                                        onClick={() => model.createPlanMutation.mutate({ code: create.code.trim(), name: create.name.trim(), description: create.description.trim() || undefined, price_cents: Number(create.price_cents), interval: create.interval.trim(), is_default: create.is_default, features: create.features.split(",").map((v) => v.trim()).filter(Boolean) })}
                                        type="button">{model.createPlanMutation.isPending ? "Creating..." : "Create plan"}</Button>
                                </div></div>
                                <div className="flex gap-3">{plans.map((plan) => { const d = model.planDrafts[plan.id]; const saving = model.updatePlanMutation.isPending && model.updatePlanMutation.variables?.id === plan.id; return (
                                    <div key={plan.id} style={({
                                        padding: 20,
                                        borderRadius: 16,
                                        border: `1px solid ${"var(--border)"}`
                                    })}><div className="flex gap-3">
                                                            <div className="flex flex-row gap-2 items-center"><p>{plan.code}</p>{plan.is_default && <Badge variant="secondary">Default</Badge>}</div>
                                                            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}>
                                                                <FormField label="Name" value={d.name} onChange={(e: any) => model.setPlanDrafts((v) => ({ ...v, [plan.id]: { ...d, name: e.target.value } }))} />
                                                                <FormField label="Price (cents)" value={d.price_cents} onChange={(e: any) => model.setPlanDrafts((v) => ({ ...v, [plan.id]: { ...d, price_cents: e.target.value } }))} />
                                                                <FormField label="Interval" value={d.interval} onChange={(e: any) => model.setPlanDrafts((v) => ({ ...v, [plan.id]: { ...d, interval: e.target.value } }))} />
                                                                <FormField label="Features" value={d.features} onChange={(e: any) => model.setPlanDrafts((v) => ({ ...v, [plan.id]: { ...d, features: e.target.value } }))} />
                                                            </div>
                                                            <FormField label="Description" value={d.description} onChange={(e: any) => model.setPlanDrafts((v) => ({ ...v, [plan.id]: { ...d, description: e.target.value } }))} />
                                                            <div className="flex flex-col sm:flex-row gap-2"><Switch
                                                                    aria-label={`Activate plan ${plan.code}`}
                                                                    checked={d.is_active}
                                                                    onCheckedChange={(checked) => model.setPlanDrafts((v) => ({ ...v, [plan.id]: { ...d, is_active: checked } }))}
                                                                /><Switch
                                                                    aria-label={`Make plan ${plan.code} the default`}
                                                                    checked={d.is_default}
                                                                    onCheckedChange={(checked) => model.setPlanDrafts((v) => ({ ...v, [plan.id]: { ...d, is_default: checked } }))}
                                                                /></div>
                                                            <Button
                                                                variant="outline"
                                                                disabled={saving}
                                                                onClick={() => model.updatePlanMutation.mutate({ id: plan.id, draft: d })}
                                                                type="button">{saving ? "Saving..." : "Save plan"}</Button>
                                                        </div></div>
                                ); })}</div>
                            </div></SectionCard>
    );
}
