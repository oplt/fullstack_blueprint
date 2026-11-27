import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Plus } from "lucide-react";
import { Button } from "./button";

const meta = { title: "Blueprint/UI/Button", component: Button, tags: ["autodocs"], args: { children: "Continue", type: "button" } } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = { render: (args) => <div className="flex flex-wrap gap-3"><Button {...args}>Primary</Button><Button {...args} variant="secondary">Secondary</Button><Button {...args} variant="outline">Outline</Button><Button {...args} variant="ghost">Ghost</Button><Button {...args} disabled>Disabled</Button></div> };
export const KeyboardInteraction: Story = { play: async ({ canvasElement }) => { const canvas = within(canvasElement); const button = canvas.getByRole("button", { name: "Continue" }); await userEvent.tab(); await expect(button).toHaveFocus(); } };

export const SemanticVariants: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">App primary</Button>
            <Button variant="outline">App outline</Button>
            <Button variant="ghost">App ghost</Button>
            <Button variant="nav-primary" size="nav">Nav primary</Button>
            <Button variant="nav-ghost" size="nav">Nav ghost</Button>
            <Button variant="marketing">Marketing CTA</Button>
            <Button variant="marketing-secondary">Secondary CTA</Button>
            <Button variant="category" size="category" aria-pressed="true">Category</Button>
            <Button variant="ghost" size="icon" aria-label="Add item"><Plus /></Button>
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const styles = (name: string) => getComputedStyle(canvas.getByRole("button", { name }));

        await expect(styles("App primary").borderRadius).toBe("6px");
        await expect(styles("App primary").height).toBe("44px");
        await expect(styles("App primary").paddingLeft).toBe("14px");
        await expect(styles("App outline").backgroundColor).toBe("rgb(255, 255, 255)");
        await expect(styles("Nav primary").paddingLeft).toBe("6px");
        await expect(styles("Nav primary").height).toBe("44px");
        await expect(styles("Marketing CTA").borderRadius).toBe("100px");
        await expect(styles("Marketing CTA").fontSize).toBe("16px");
        await expect(styles("Marketing CTA").lineHeight).toBe("20px");
        await expect(styles("Marketing CTA").paddingLeft).toBe("14px");
        await expect(styles("Category").borderRadius).toBe("64px");
        await expect(styles("Add item").borderRadius).toBe("9999px");
        await expect(styles("Add item").height).toBe("44px");
        await expect(styles("Add item").width).toBe("44px");
    },
};
