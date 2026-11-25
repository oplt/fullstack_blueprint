import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
type PageTabItem<T extends string = string> = { value: T; label: ReactNode; disabled?: boolean };
type PageTabsProps<T extends string = string> = { value: T; onChange: (value: T) => void; tabs: PageTabItem<T>[]; ariaLabel?: string; sx?: CSSProperties };
export function PageTabs<T extends string = string>({ value, onChange, tabs, ariaLabel = "Page sections", sx }: PageTabsProps<T>) { return <div className="mb-4 w-full min-w-0 border-b border-border" style={sx}><div role="tablist" aria-label={ariaLabel} className="flex max-w-full gap-1 overflow-x-auto">{tabs.map((tab) => <button key={tab.value} type="button" role="tab" aria-selected={tab.value === value} disabled={tab.disabled} onClick={() => onChange(tab.value)} className={cn("shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors", tab.value === value && "border-primary text-foreground", "disabled:pointer-events-none disabled:opacity-50")}>{tab.label}</button>)}</div></div>; }
