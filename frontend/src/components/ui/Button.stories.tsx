import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "./button";

const meta = { title: "Blueprint/UI/Button", component: Button, tags: ["autodocs"], args: { children: "Continue", type: "button" } } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = { render: (args) => <div className="flex flex-wrap gap-3"><Button {...args}>Primary</Button><Button {...args} variant="secondary">Secondary</Button><Button {...args} variant="outline">Outline</Button><Button {...args} variant="ghost">Ghost</Button><Button {...args} disabled>Disabled</Button></div> };
export const KeyboardInteraction: Story = { play: async ({ canvasElement }) => { const canvas = within(canvasElement); const button = canvas.getByRole("button", { name: "Continue" }); await userEvent.tab(); await expect(button).toHaveFocus(); } };
