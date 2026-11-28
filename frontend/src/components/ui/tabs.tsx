import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
    return <TabsPrimitive.Root data-slot="tabs" orientation={orientation} className={cn("group/tabs ui-tabs", className)} {...props} />;
}
const tabsListVariants = cva("group/tabs-list ui-tabs-list", { variants: { variant: { default: "ui-tabs-list-default", line: "ui-tabs-list-line" } }, defaultVariants: { variant: "default" } });
function TabsList({ className, variant = "default", ...props }: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) { return <TabsPrimitive.List data-slot="tabs-list" data-variant={variant} className={cn(tabsListVariants({ variant }), className)} {...props} />; }
function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) { return <TabsPrimitive.Tab data-slot="tabs-trigger" className={cn("ui-tabs-trigger", className)} {...props} />; }
function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) { return <TabsPrimitive.Panel data-slot="tabs-panel" className={cn("ui-tabs-panel", className)} {...props} />; }
export { Tabs, TabsList, TabsPanel, TabsTrigger };
