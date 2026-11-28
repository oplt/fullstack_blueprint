import { Card, CardContent } from "@/components/ui/card";
type Highlight = { value: string; label: string };
type AuthMarketingPanelProps = { appName: string; eyebrow: string; title: string; description: string; highlights?: Highlight[]; points?: string[] };
export function AuthMarketingPanel({ appName, eyebrow, title, description, highlights = [], points = [] }: AuthMarketingPanelProps) {
    return <div className="ui-auth-marketing">
        <div className="flex w-full min-w-0 flex-col gap-ui-xl">
            <header className="flex w-full min-w-0 flex-col gap-ui-md">
                <p className="font-mono text-mono-eyebrow uppercase text-muted-foreground">{eyebrow}</p>
                <h1 className="ui-auth-heading w-full text-display-lg xl:text-display-xl">{title}</h1>
                <p className="ui-auth-description w-full text-body-lg text-muted-foreground">{description}</p>
            </header>
            {highlights.length > 0 && <div className="grid w-full grid-cols-1 gap-ui-md xl:grid-cols-3">
                {highlights.map((item) => <Card key={item.label} size="sm" className="min-w-0 bg-background/60"><CardContent><dl>
                    <dt className="ui-metric-label">{item.label}</dt><dd className="ui-metric-value mt-ui-xxs">{item.value}</dd>
                </dl></CardContent></Card>)}
            </div>}
            {points.length > 0 && <ul className="ui-auth-points">{points.map((point) => <li key={point} className="ui-auth-point"><span aria-hidden="true" className="ui-auth-point-marker"/><span>{point}</span></li>)}</ul>}
        </div>
        <footer className="ui-auth-footer"><p className="text-label-sm">{appName}</p></footer>
    </div>;
}
