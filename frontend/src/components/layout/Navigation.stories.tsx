import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter, NavLink } from "react-router-dom";
import { Menu, Settings, Sparkles } from "lucide-react";
import { Button } from "../ui/button";

const items = [{ label: "Dashboard", path: "/dashboard", icon: Sparkles }, { label: "Settings", path: "/settings", icon: Settings }];
const meta = { title: "Blueprint/Navigation", tags: ["autodocs"], parameters: { layout: "fullscreen", viewport: { defaultViewport: "responsive" } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Responsive: Story = { render: () => <MemoryRouter initialEntries={["/dashboard"]}><div className="flex min-h-72 w-full border border-border bg-card"><aside className="hidden w-56 border-r p-3 sm:block"><p className="mb-3 px-3 font-semibold">Blueprint</p><nav aria-label="Main navigation" className="space-y-1">{items.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted"><Icon className="size-4" />{label}</NavLink>)}</nav></aside><main className="min-w-0 flex-1 p-4"><div className="flex items-center justify-between"><h1 className="text-lg font-semibold">Dashboard</h1><Button className="sm:hidden" variant="outline" size="icon" aria-label="Open navigation"><Menu /></Button></div><p className="mt-3 text-sm text-muted-foreground">Resize the viewport to exercise desktop and mobile affordances.</p></main></div></MemoryRouter> };
