import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { SectionCard } from "./SectionCard";
import { StatCard } from "./StatCard";
import { ComparisonCard } from "./ComparisonCard";
import { Button } from "./button";
import { FormField } from "./form-field";
import { Badge } from "./badge";
import { ResponsiveCardGrid } from "./ResponsiveCardGrid";
import { PageShell } from "./PageShell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { LineChartCard } from "./charts";

const meta = { title: "Blueprint/Validation/Design system", parameters: { layout: "fullscreen", a11y: { test: "error" } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Gallery: Story = { render: () => <main className="page-gutters" data-testid="design-gallery"><PageShell>
    <h1 className="text-page-title">Design validation</h1>
    <ResponsiveCardGrid columns={4}>
        <Card size="sm" data-testid="dense-card"><CardHeader><CardTitle as="h2">Dense</CardTitle></CardHeader><CardContent>Compact content</CardContent></Card>
        <SectionCard title="Standard">Standard content</SectionCard>
        <StatCard label="Projects" value={42} icon={<FolderOpen aria-hidden="true" />} />
        <ComparisonCard title="Runs" value={24} comparison={12.5} />
    </ResponsiveCardGrid>
    <Card size="lg" data-testid="large-card"><CardHeader><CardTitle as="h2">Controls</CardTitle></CardHeader><CardContent>
        <div className="stack"><FormField label="Project name" placeholder="Name" /><FormField as="textarea" label="Description" /><FormField as="select" label="Mode"><option>Default</option></FormField>
            <div className="flex flex-wrap gap-ui-xs"><Button type="button">Continue</Button><Button type="button" variant="outline">Cancel</Button><Button type="button" variant="destructive">Delete</Button><Badge variant="success">Ready</Badge><Badge variant="warning">Pending</Badge><Badge variant="destructive">Failed</Badge></div>
        </div>
    </CardContent></Card>
    <LineChartCard title="Activity" description="Monthly project counts" data={[{month:"Jan",count:10},{month:"Feb",count:15},{month:"Mar",count:12}]} xKey="month" series={[{dataKey:"count",label:"Projects"}]} />
</PageShell></main> };
export const NestedOverlay: Story = { render: () => <main className="page-gutters"><h1 className="text-page-title">Overlay validation</h1><Dialog><DialogTrigger render={<Button type="button" />}>Open dialog</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Project settings</DialogTitle><DialogDescription>Review your settings.</DialogDescription></DialogHeader><Popover><PopoverTrigger render={<Button variant="outline" type="button" />}>Open details</PopoverTrigger><PopoverContent><p>Nested details</p><Button type="button">Nested action</Button></PopoverContent></Popover></DialogContent></Dialog></main> };
