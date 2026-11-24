import { Button } from "@/components/ui/button";import { FormField } from "@/components/ui/form-field";
import type { EmailTemplate } from "../../../api/platform";
import { SectionCard } from "../../../components/ui/SectionCard";
import type { PlatformAdminModel } from "../hooks/usePlatformAdminContent";

export function TemplatesSection({ templates, model }: { templates: EmailTemplate[]; model: PlatformAdminModel }) {
    const n = model.newTemplate;
    return (
        <SectionCard title="Email templates" description="Create and update reusable transactional email templates."><div className="flex gap-[20px]">
                                    <div style={({
                                        padding: 20,
                                        borderRadius: 16,
                                        border: `1px solid ${"var(--border)"}`
                                    })}><div className="flex gap-[12px]"><p>Create template</p>
                                        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr" }}><FormField label="Key" value={n.key} onChange={(e: any) => model.setNewTemplate((v) => ({ ...v, key: e.target.value }))} /><FormField label="Name" value={n.name} onChange={(e: any) => model.setNewTemplate((v) => ({ ...v, name: e.target.value }))} /></div>
                                        <FormField label="Subject" value={n.subject_template} onChange={(e: any) => model.setNewTemplate((v) => ({ ...v, subject_template: e.target.value }))} /><FormField label="HTML body" value={n.html_template} onChange={(e: any) => model.setNewTemplate((v) => ({ ...v, html_template: e.target.value }))} multiline rows={4} /><FormField label="Text body" value={n.text_template} onChange={(e: any) => model.setNewTemplate((v) => ({ ...v, text_template: e.target.value }))} multiline rows={3} />
                                        <label><input
                                                checked={n.is_active}
                                                onChange={(e: any) => model.setNewTemplate((v) => ({ ...v, is_active: e.target.checked }))}
                                                type="checkbox"
                                                role="switch" /></label><Button
                                        variant="default"
                                        disabled={model.createTemplateMutation.isPending || n.key.trim().length < 2}
                                        onClick={() => model.createTemplateMutation.mutate({ key: n.key.trim(), name: n.name.trim(), subject_template: n.subject_template, html_template: n.html_template, text_template: n.text_template || null, is_active: n.is_active })}
                                        type="button">{model.createTemplateMutation.isPending ? "Creating..." : "Create template"}</Button>
                                    </div></div>
                                    <div className="flex gap-[12px]">{templates.map((item) => { const d = model.templateDrafts[item.id]; const saving = model.updateTemplateMutation.isPending && model.updateTemplateMutation.variables?.id === item.id; return (
                                        <div key={item.id} style={({
                                            padding: 20,
                                            borderRadius: 16,
                                            border: `1px solid ${"var(--border)"}`
                                        })}><div className="flex gap-[12px]"><p>{item.key}</p>
                                                                    <FormField label="Name" value={d.name} onChange={(e: any) => model.setTemplateDrafts((v) => ({ ...v, [item.id]: { ...d, name: e.target.value } }))} /><FormField label="Subject" value={d.subject_template} onChange={(e: any) => model.setTemplateDrafts((v) => ({ ...v, [item.id]: { ...d, subject_template: e.target.value } }))} /><FormField label="HTML body" value={d.html_template} onChange={(e: any) => model.setTemplateDrafts((v) => ({ ...v, [item.id]: { ...d, html_template: e.target.value } }))} multiline rows={4} /><FormField label="Text body" value={d.text_template} onChange={(e: any) => model.setTemplateDrafts((v) => ({ ...v, [item.id]: { ...d, text_template: e.target.value } }))} multiline rows={3} />
                                                                    <label><input
                                                                            checked={d.is_active}
                                                                            onChange={(e: any) => model.setTemplateDrafts((v) => ({ ...v, [item.id]: { ...d, is_active: e.target.checked } }))}
                                                                            type="checkbox"
                                                                            role="switch" /></label><Button
                                                                    variant="outline"
                                                                    disabled={saving}
                                                                    onClick={() => model.updateTemplateMutation.mutate({ id: item.id, draft: d })}
                                                                    type="button">{saving ? "Saving..." : "Save template"}</Button>
                                                                </div></div>
                                    ); })}</div>
                                </div></SectionCard>
    );
}
