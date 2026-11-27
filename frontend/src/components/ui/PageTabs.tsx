import type { ReactNode } from "react";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
type PageTabItem<T extends string = string> = { value: T; label: ReactNode; disabled?: boolean };
type PageTabsProps<T extends string = string> = { value: T; onChange: (value: T) => void; tabs: PageTabItem<T>[]; ariaLabel?: string; className?: string; children?: ReactNode };
export function PageTabs<T extends string = string>({ value, onChange, tabs, ariaLabel = "Page sections", className, children }: PageTabsProps<T>) {
    return <Tabs value={value} onValueChange={(nextValue) => { const nextTab = tabs.find((tab) => tab.value === nextValue); if (nextTab && !nextTab.disabled) onChange(nextTab.value); }} className={cn("ui-page-tabs", className)}><TabsList variant="line" aria-label={ariaLabel} className="ui-page-tabs-list">{tabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled} className="ui-page-tabs-trigger">{tab.label}</TabsTrigger>)}</TabsList>{children}</Tabs>;
}
export { TabsPanel };
