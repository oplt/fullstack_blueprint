import type { Meta, StoryObj } from "@storybook/react-vite";
import { Typography } from "./muiCompat";

const meta = {
    title: "Blueprint/Design system/Typography",
    component: Typography,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = {
    render: () => (
        <div className="grid max-w-3xl gap-5">
            <Typography variant="h1" component="h1">Page heading</Typography>
            <Typography variant="h2" component="h2">Section heading</Typography>
            <Typography variant="h3" component="h3">Card heading</Typography>
            <Typography variant="body1" component="p">Body text uses the shared text face and tokenized color.</Typography>
            <Typography variant="body2" component="p" color="text.secondary">Secondary text supports metadata and helper copy.</Typography>
            <Typography variant="caption" component="p">Caption text remains readable at compact sizes.</Typography>
        </div>
    ),
};

export const LongContent: Story = {
    render: () => (
        <Typography variant="body1" component="p" className="max-w-prose">
            Blueprint typography is designed for sustained reading. This fixture intentionally contains a longer paragraph so wrapping, line height, contrast, and dark-mode surfaces can be reviewed at desktop and mobile widths without a backend or generated content.
        </Typography>
    ),
};

export const AccessibleHeading: Story = {
    render: () => (
        <section aria-labelledby="typography-story-heading" className="grid gap-2">
            <Typography id="typography-story-heading" variant="h2" component="h2">Accessible section heading</Typography>
            <Typography variant="body1" component="p">The semantic heading level is explicit instead of relying on visual styling alone.</Typography>
        </section>
    ),
};
