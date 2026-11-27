import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Blueprint/Design system/Typography", tags: ["autodocs"], parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = { render: () => <div className="grid max-w-3xl gap-5"><h1 className="text-display-xl font-semibold">Marketing hero</h1><h2 className="text-display-lg font-semibold">Major section</h2><h3 className="text-display-md font-semibold">Sub-section and card title</h3><p className="text-page-title font-semibold">Application page title</p><p className="text-label-sm font-medium">Strong navigation label</p><p className="font-mono text-mono-eyebrow font-medium uppercase">Technical section eyebrow</p><p className="text-body-lg">Lead paragraph uses the large body role.</p><p className="text-body-md">Default body uses the shared text face and tokenized color.</p><p className="text-body-sm text-muted-foreground">Caption text remains readable at compact sizes.</p><pre className="rounded-md border border-border bg-card p-4 font-mono text-code">const answer = 42;</pre></div> };
export const LongContent: Story = { render: () => <p className="max-w-prose">Blueprint typography is designed for sustained reading. This fixture intentionally contains a longer paragraph so wrapping, line height, contrast, and dark-mode surfaces can be reviewed at desktop and mobile widths without a backend or generated content.</p> };
export const AccessibleHeading: Story = { render: () => <section aria-labelledby="typography-story-heading" className="grid gap-2"><h2 id="typography-story-heading">Accessible section heading</h2><p>Semantic heading levels are explicit instead of relying on visual styling alone.</p></section> };
