import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
const apiBaseUrl = process.env.E2E_API_URL ?? "http://localhost:8000";

async function createAuthenticatedContext(browser: import("@playwright/test").Browser) {
    const context = await browser.newContext();
    const signIn = await context.request.post(`${apiBaseUrl}/api/v1/auth/sign-in`, {
        data: { email, password },
    });
    expect(signIn.ok()).toBeTruthy();
    return context;
}

test.describe("workspace smoke", () => {
    test("redirects signed-out users away from dashboard", async ({ page }) => {
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/$/);
    });

    test("login page renders sign-in controls", async ({ page }) => {
        await page.goto("/");
        await expect(page.locator("form").first().getByRole("button", { name: /sign in/i })).toBeVisible();
    });

  test("verification and password reset pages expose safe no-token states", async ({ page }) => {
    await page.goto("/verify-email");
    await expect(page.getByText(/check your email for a verification link/i)).toBeVisible();
    await page.goto("/reset-password");
    await expect(page.getByText(/no reset token found/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /reset password/i })).toBeDisabled();
  });
});

test.describe("authenticated AI flow", () => {
    test.skip(process.env.E2E_AI_RAG !== "1" || !email || !password, "Requires enabled AI, RAG, storage, and a provisioned user.");

    test("ingest a text document in AI Studio", async ({ browser }) => {
        const context = await createAuthenticatedContext(browser);
        const page = await context.newPage();

        await page.goto("/ai");
        await expect(page.getByRole("heading", { name: /AI Studio/i })).toBeVisible();

        const title = `E2E Notes ${randomUUID()}`;
        await page.getByLabel("Document title").fill(title);
        await page.getByLabel("Document content").fill(
            `Playwright uploaded ${title} for retrieval tests.`
        );
        await page.getByRole("button", { name: "Create text document" }).click();

        await expect(page.getByText("Document queued for indexing.")).toBeVisible();
        await expect(page.getByRole("heading", { name: title })).toBeVisible();

        await context.close();
    });

    test("ask via agent run API after document ingest", async ({ browser }) => {
        const context = await createAuthenticatedContext(browser);
        const csrfToken = (await context.cookies()).find((cookie) => cookie.name === (process.env.E2E_CSRF_COOKIE ?? "blueprint_csrf"))?.value;

        const headers = csrfToken ? { "X-CSRF-Token": csrfToken } : undefined;
        const content = `Blueprint stores violet notebooks in the supply cabinet. Reference ${randomUUID()}.`;
        const upload = await context.request.post(`${apiBaseUrl}/api/v1/ai/documents`, {
            headers,
            data: { title: `Notebook ${randomUUID()}`, content, content_type: "text/plain" },
        });
        expect(upload.ok(), await upload.text()).toBeTruthy();
        const documentId = (await upload.json()).id;
        await expect.poll(async () => {
            const response = await context.request.get(`${apiBaseUrl}/api/v1/rag/documents/${documentId}`);
            expect(response.ok(), await response.text()).toBeTruthy();
            return (await response.json()).status;
        }, { timeout: 20_000 }).toBe("indexed");
        const retrieval = await context.request.post(`${apiBaseUrl}/api/v1/rag/retrieve`, {
            headers,
            data: { query: content, document_ids: [documentId] },
        });
        expect(retrieval.ok(), await retrieval.text()).toBeTruthy();
        const outcome = await retrieval.json();
        expect(outcome.chunks[0]?.document_id).toBe(documentId);
        expect(outcome.degraded).toBe(false);

        const templateKey = `e2e_${Date.now()}`;
        const template = await context.request.post(`${apiBaseUrl}/api/v1/ai/prompts`, {
            headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
            data: {
                key: templateKey,
                name: "E2E Prompt",
                description: "Prompt for Playwright smoke test",
            },
        });
        expect(template.ok()).toBeTruthy();
        const templateId = (await template.json()).id;

        const version = await context.request.post(
            `${apiBaseUrl}/api/v1/ai/prompts/${templateId}/versions`,
            {
                headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
                data: {
                    provider_key: "local",
                    model_name: "local-heuristic",
                    system_prompt: "You are concise.",
                    user_prompt_template: "Answer: {{question}}",
                    variable_definitions: [{ name: "question", required: true }],
                    is_published: true,
                },
            }
        );
        expect(version.ok(), await version.text()).toBeTruthy();

        const run = await context.request.post(`${apiBaseUrl}/api/v1/agent/runs`, {
            headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
            data: {
                prompt_template_key: templateKey,
                variables: { question: "Say hello from e2e." },
                user_message: content,
                retrieval_query: content,
                document_ids: [documentId],
            },
        });
        expect(run.ok(), await run.text()).toBeTruthy();
        const body = await run.json();
        expect(body.status).toBe("completed");
        expect(body.output_text).toBeTruthy();

        await context.close();
    });
});
