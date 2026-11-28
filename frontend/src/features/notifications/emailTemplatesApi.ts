import { apiFetch, type ApiRequestOptions } from "@/lib/api";

export type EmailTemplate = {
    id: string;
    key: string;
    name: string;
    subject_template: string;
    html_template: string;
    text_template: string | null;
    is_active: boolean;
    updated_at: string;
};

export async function listAdminEmailTemplates(options?: ApiRequestOptions): Promise<EmailTemplate[]> {
    return apiFetch("/platform/admin/email-templates", options);
}

export async function createAdminEmailTemplate(payload: {
    key: string;
    name: string;
    subject_template: string;
    html_template: string;
    text_template?: string | null;
    is_active?: boolean;
}): Promise<EmailTemplate> {
    return apiFetch("/platform/admin/email-templates", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateAdminEmailTemplate(
    templateId: string,
    payload: Partial<{
        name: string;
        subject_template: string;
        html_template: string;
        text_template: string | null;
        is_active: boolean;
    }>
): Promise<EmailTemplate> {
    return apiFetch(`/platform/admin/email-templates/${templateId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}
