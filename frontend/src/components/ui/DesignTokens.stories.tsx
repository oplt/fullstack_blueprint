import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Blueprint/Foundations/Design tokens", tags: ["autodocs"] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const SemanticTokens: Story = { render: () => <article className="w-full rounded-xl border border-border bg-card p-ui-md"><h2 className="font-semibold">Semantic tokens</h2><div className="mt-ui-sm flex gap-ui-xs"><span className="size-10 rounded-lg bg-primary" /><span className="size-10 rounded-lg bg-accent" /><span className="size-10 rounded-lg bg-success" /></div><p className="mt-ui-xs text-body-md text-muted-foreground">CSS-owned semantic tokens</p></article> };
