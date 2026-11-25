
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
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {eyebrow}
                    </p>

                    <h1 className="w-full max-w-[640px] text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                        {title}
                    </h1>

                    <p className="w-full max-w-[560px] text-base leading-relaxed text-muted-foreground">
                        {description}
                    </p>
                </header>

                {highlights.length > 0 && (
                    <dl className="grid w-full grid-cols-1 gap-4 xl:grid-cols-3">
                        {highlights.map((item) => (
                            <div
                                key={item.label}
                                className="min-w-0 rounded-lg border border-border bg-background/60 p-4"
                            >
                                <dt className="text-sm text-muted-foreground">
                                    {item.label}
                                </dt>

                                <dd className="mt-1 text-2xl font-semibold tracking-tight">
                                    {item.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}

                {points.length > 0 && (
                    <ul className="flex flex-col gap-3">
                        {points.map((point) => (
                            <li
                                key={point}
                                className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground"
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
                <p className="text-sm font-semibold">
                    {appName}
                </p>
            </footer>

        </div>
    );
}
