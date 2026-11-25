import type { Meta, StoryObj } from "@storybook/react-vite";
import { themePresets } from "../../app/theme";

const meta = { title: "Blueprint/Foundations/Design tokens", tags: ["autodocs"] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Presets: Story = { render: () => <div className="grid w-full gap-4 sm:grid-cols-2">{themePresets.map((preset) => <article key={preset} data-theme-preset={preset} className="rounded-xl border border-border bg-card p-4"><h2 className="font-semibold">{preset}</h2><div className="mt-3 flex gap-2"><span className="size-10 rounded-lg bg-primary" /><span className="size-10 rounded-lg bg-accent" /><span className="size-10 rounded-lg bg-success" /></div><p className="mt-2 text-sm text-muted-foreground">CSS-owned semantic tokens</p></article>)}</div> };
