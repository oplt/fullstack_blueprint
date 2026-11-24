import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "./button";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./error-state";
import { LoadingState } from "./loading-state";

const meta = { title: "Blueprint/UI/Feedback states", component: LoadingState, tags: ["autodocs"] } satisfies Meta<typeof LoadingState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Loading: Story = { args: { label: "Loading workspace" } };
export const Empty: Story = { render: () => <EmptyState icon={<span aria-hidden="true">∅</span>} title="No results" description="There is nothing to display yet." action={<Button type="button">Create one</Button>} /> };
export const ErrorWithRetry: Story = { render: () => <ErrorState title="Connection failed" description="The fixture request failed." onRetry={() => undefined} />, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await userEvent.click(canvas.getByRole("button", { name: "Try again" })); await expect(canvas.getByRole("alert")).toBeInTheDocument(); } };
