import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { GenerativeUiRenderer } from "./renderers/GenerativeUiRenderer";
import { generativeUiExamples } from "./examples";

const meta = { title: "Blueprint/AI/Generative UI", component: GenerativeUiRenderer, tags: ["autodocs"], parameters: { layout: "fullscreen" } } satisfies Meta<typeof GenerativeUiRenderer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = { args: { payload: generativeUiExamples.overview } };
export const Report: Story = { args: { payload: generativeUiExamples.report } };
export const InvalidFallback: Story = { args: { payload: { version: 1, components: [{ type: "script", id: "unsafe", script: "alert(1)" }] } }, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await expect(canvas.getByRole("alert")).toHaveTextContent("could not be displayed safely"); } };
export const AuthorizedFormAction: Story = { args: { payload: { version: 1, components: [{ type: "form", id: "feedback", title: "Send feedback", fields: [{ id: "message", label: "Message", type: "textarea", required: true }], submitAction: { actionId: "submit-feedback", label: "Submit", kind: "submit", payload: {}, requiresConfirmation: true } }] }, onAction: async () => ({ status: "executed" as const }) }, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await userEvent.type(canvas.getByLabelText(/Message/), "Looks good"); await expect(canvas.getByRole("button", { name: "Submit" })).toBeEnabled(); } };
