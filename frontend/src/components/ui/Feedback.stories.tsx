import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "./button";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { EmptyState } from "../Feedback";
import { ErrorState } from "../Feedback";
import { LoadingState } from "../Feedback";

const meta = { title: "Blueprint/UI/Feedback states", component: LoadingState, tags: ["autodocs"] } satisfies Meta<typeof LoadingState>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Loading: Story = { args: { label: "Loading workspace" } };
export const Empty: Story = { render: () => <EmptyState icon={<span aria-hidden="true">∅</span>} title="No results" description="There is nothing to display yet." action={<Button type="button">Create one</Button>} /> };
export const ErrorWithRetry: Story = { render: () => <ErrorState title="Connection failed" description="The fixture request failed." onRetry={() => undefined} />, play: async ({ canvasElement }) => { const canvas = within(canvasElement); await userEvent.click(canvas.getByRole("button", { name: "Try again" })); await expect(canvas.getByRole("alert")).toBeInTheDocument(); } };
export const Alerts: Story = { render: () => <div className="grid gap-ui-sm"><Alert variant="information"><AlertTitle>Information</AlertTitle><AlertDescription>Review the current workspace settings.</AlertDescription></Alert><Alert role="status" variant="success"><AlertTitle>Saved</AlertTitle><AlertDescription>Your changes are active.</AlertDescription></Alert><Alert variant="warning"><AlertTitle>Attention</AlertTitle><AlertDescription>This action needs review.</AlertDescription></Alert><Alert variant="destructive"><AlertTitle>Unable to save</AlertTitle><AlertDescription>Try again in a moment.</AlertDescription></Alert></div> };
