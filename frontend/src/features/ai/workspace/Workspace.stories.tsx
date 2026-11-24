import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArtifactPreview, ConversationHistory, HumanApprovalRequest, ToolExecutionStatus } from "./components";
import type { AiArtifact, AiMessage, AiToolCall } from "./types";

const messages: AiMessage[] = [{ id: "user-1", role: "user", content: "Summarize the latest project update.", citations: [] }, { id: "assistant-1", role: "assistant", content: "## Project update\n\nThe release is ready for review.", citations: [{ id: "citation-1", title: "Release notes", url: "https://example.test/release", snippet: "Ready for review" }] }];
const meta = { title: "Blueprint/AI workspace", component: ConversationHistory, tags: ["autodocs"], parameters: { layout: "fullscreen" } } satisfies Meta<typeof ConversationHistory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Conversation: Story = { args: { messages } };
export const Streaming: Story = { args: { messages: [{ ...messages[1], id: "streaming", content: "The assistant is still writing", streaming: true }] } };
export const LongConversation: Story = { args: { messages: Array.from({ length: 100 }, (_, index) => ({ id: `message-${index}`, role: index % 2 ? "assistant" : "user", content: `Message ${index}`, citations: [] })) } };

export const ToolActivity: Story = { args: { messages }, render: () => <ToolExecutionStatus calls={[{ id: "tool-1", name: "search_documents", status: "running", input: { query: "release" } } as AiToolCall, { id: "tool-2", name: "summarize", status: "completed", output: { summary: "Complete" } }]} /> };
export const Approval: Story = { args: { messages }, render: () => <HumanApprovalRequest title="Approve deployment" description="This action will publish the generated artifact." onResolve={() => undefined} />, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await userEvent.click(canvas.getByRole("button", { name: "Decline" })); await expect(canvas.getByRole("alertdialog")).toBeInTheDocument(); } };
export const Artifact: Story = { args: { messages }, render: () => <ArtifactPreview artifact={{ id: "artifact-1", title: "Report", contentType: "markdown", content: "# Generated report\n\nSafe, deterministic fixture." } satisfies AiArtifact} /> };
