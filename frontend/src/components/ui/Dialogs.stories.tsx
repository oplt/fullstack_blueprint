import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Button } from "./button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./dialog";

const meta = {
    title: "Blueprint/UI/Dialog",
    component: Dialog,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function DialogExample({ longContent = false }: { longContent?: boolean }) {
    return (
        <Dialog>
            <DialogTrigger render={<Button>Open details</Button>} />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Project details</DialogTitle>
                    <DialogDescription>
                        Review the project configuration before continuing.
                    </DialogDescription>
                </DialogHeader>
                <p className="text-body-md text-muted-foreground">
                    {longContent
                        ? "This longer dialog body demonstrates bounded scrolling and readable line length. ".repeat(8)
                        : "Changes are saved securely and can be revised later."}
                </p>
                <DialogFooter>
                    <DialogClose render={<Button variant="outline">Cancel</Button>} />
                    <DialogClose render={<Button>Continue</Button>} />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export const Closed: Story = { render: () => <DialogExample /> };

export const OpensAndCloses: Story = {
    render: () => <DialogExample />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole("button", { name: "Open details" }));
        await expect(body.getByRole("dialog")).toBeVisible();
        await userEvent.click(body.getByRole("button", { name: "Cancel" }));
        await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
    },
};

export const LongContent: Story = { render: () => <DialogExample longContent /> };
