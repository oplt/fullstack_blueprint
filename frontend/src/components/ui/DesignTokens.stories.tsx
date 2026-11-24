import type { Meta, StoryObj } from "@storybook/react-vite";
import { createDesignTokens, themePresets } from "../../app/designTokens";

const meta = { title: "Blueprint/Foundations/Design tokens", tags: ["autodocs"] } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Presets: Story = { render: () => <div className="grid w-full gap-4 sm:grid-cols-2">{themePresets.map((preset) => { const tokens = createDesignTokens({ preset, mode: "light", density: "comfortable", radius: "md" }); return <article key={preset} className="rounded-xl border border-border p-4"><h2 className="font-semibold">{preset}</h2><div className="mt-3 flex gap-2"><span className="size-10 rounded-lg" style={{ background: tokens.colors.primary }} /><span className="size-10 rounded-lg" style={{ background: tokens.colors.accent }} /><span className="size-10 rounded-lg" style={{ background: tokens.colors.success }} /></div><p className="mt-2 text-sm text-muted-foreground">{tokens.typography.text}</p></article>; })}</div> };
