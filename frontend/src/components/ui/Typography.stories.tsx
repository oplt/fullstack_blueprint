import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Blueprint/Design system/Typography", tags: ["autodocs"], parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = { render: () => <div className="grid max-w-3xl gap-5"><h1>Page heading</h1><h2>Section heading</h2><h3>Card heading</h3><p>Body text uses the shared text face and tokenized color.</p><p className="text-muted-foreground">Secondary text supports metadata and helper copy.</p><p className="text-sm text-muted-foreground">Caption text remains readable at compact sizes.</p></div> };
export const LongContent: Story = { render: () => <p className="max-w-prose">Blueprint typography is designed for sustained reading. This fixture intentionally contains a longer paragraph so wrapping, line height, contrast, and dark-mode surfaces can be reviewed at desktop and mobile widths without a backend or generated content.</p> };
export const AccessibleHeading: Story = { render: () => <section aria-labelledby="typography-story-heading" className="grid gap-2"><h2 id="typography-story-heading">Accessible section heading</h2><p>Semantic heading levels are explicit instead of relying on visual styling alone.</p></section> };
