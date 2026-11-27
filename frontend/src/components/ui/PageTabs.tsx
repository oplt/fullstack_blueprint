import type { ReactNode } from "react";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type PageTabItem<T extends string = string> = {
    value: T;
    label: ReactNode;
    disabled?: boolean;
};

type PageTabsProps<T extends string = string> = {
    value: T;
    onChange: (value: T) => void;
    tabs: PageTabItem<T>[];
    ariaLabel?: string;
    className?: string;
    children?: ReactNode;
};

export function PageTabs<T extends string = string>({
    value,
    onChange,
    tabs,
    ariaLabel = "Page sections",
    className,
    children,
}: PageTabsProps<T>) {
    return (
        <Tabs
            value={value}
            onValueChange={(nextValue) => {
                const nextTab = tabs.find((tab) => tab.value === nextValue);
                if (nextTab && !nextTab.disabled) onChange(nextTab.value);
            }}
            className={cn("mb-4 w-full min-w-0", className)}
        >
            <TabsList
                variant="line"
                aria-label={ariaLabel}
                className="max-w-full overflow-x-auto border-b border-border"
            >
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        disabled={tab.disabled}
                        className="shrink-0 px-3 py-2"
                    >
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            {children}
        </Tabs>
    );
}

export { TabsPanel }
