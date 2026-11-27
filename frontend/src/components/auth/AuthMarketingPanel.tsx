import { Card, CardContent } from "@/components/ui/card";

type Highlight = {
    value: string;
    label: string;
};

type AuthMarketingPanelProps = {
    appName: string;
    eyebrow: string;
    title: string;
    description: string;
    highlights?: Highlight[];
    points?: string[];
};

export function AuthMarketingPanel({
    appName,
    eyebrow,
    title,
    description,
    highlights = [],
    points = [],
}: AuthMarketingPanelProps) {
    return (
        <div className="flex h-full w-full min-w-0 flex-col justify-between gap-12">

            <div className="flex w-full min-w-0 flex-col gap-8">

                <header className="flex w-full min-w-0 flex-col gap-4">
                    <p className="font-mono text-mono-eyebrow font-medium uppercase text-muted-foreground">
                        {eyebrow}
                    </p>

                    <h1 className="w-full max-w-[640px] text-display-lg font-semibold xl:text-display-xl">
                        {title}
                    </h1>

                    <p className="w-full max-w-[560px] text-body-lg text-muted-foreground">
                        {description}
                    </p>
                </header>

                {highlights.length > 0 && (
                    <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-3">
                        {highlights.map((item) => (
                            <Card
                                key={item.label}
                                size="sm"
                                className="min-w-0 bg-background/60"
                            >
                                <CardContent>
                                    <dl>
                                        <dt className="text-body-sm text-muted-foreground">
                                            {item.label}
                                        </dt>

                                        <dd className="mt-1 break-words text-display-md font-semibold">
                                            {item.value}
                                        </dd>
                                    </dl>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {points.length > 0 && (
                    <ul className="flex flex-col gap-3">
                        {points.map((point) => (
                            <li
                                key={point}
                                className="flex items-start gap-3 text-body-md text-muted-foreground"
                            >
                                <span
                                    aria-hidden="true"
                                    className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                                />

                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                )}

            </div>

            <footer className="w-full border-t border-border pt-6">
                <p className="text-label-sm font-medium">
                    {appName}
                </p>
            </footer>

        </div>
    );
}
