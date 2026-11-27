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
        <div className="flex h-full w-full min-w-0 flex-col justify-between ui-auto-auth-marketing-panel-div">

            <div className="flex w-full min-w-0 flex-col gap-ui-xl">

                <header className="flex w-full min-w-0 flex-col gap-ui-md">
                    <p className="ui-auto-auth-marketing-panel-p">
                        {eyebrow}
                    </p>

                    <h1 className="w-full ui-auto-auth-marketing-panel-h1">
                        {title}
                    </h1>

                    <p className="w-full ui-auto-auth-marketing-panel-p-ceea81f">
                        {description}
                    </p>
                </header>

                {highlights.length > 0 && (
                    <div className="grid w-full ui-auto-auth-marketing-panel-div-decd14a">
                        {highlights.map((item) => (
                            <Card
                                key={item.label}
                                size="sm"
                                className="min-w-0 ui-auto-auth-marketing-panel-card"
                            >
                                <CardContent>
                                    <dl>
                                        <dt className="ui-auto-auth-marketing-panel-dt">
                                            {item.label}
                                        </dt>

                                        <dd className="break-words ui-auto-auth-marketing-panel-dd">
                                            {item.value}
                                        </dd>
                                    </dl>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {points.length > 0 && (
                    <ul className="flex flex-col gap-ui-sm">
                        {points.map((point) => (
                            <li
                                key={point}
                                className="flex items-start ui-auto-auth-marketing-panel-li"
                            >
                                <span
                                    aria-hidden="true"
                                    className="shrink-0 ui-auto-auth-marketing-panel-span"
                                />

                                <span>{point}</span>
                            </li>
                        ))}
                    </ul>
                )}

            </div>

            <footer className="w-full ui-auto-auth-marketing-panel-footer">
                <p className="ui-auto-auth-marketing-panel-p-4ab4912">
                    {appName}
                </p>
            </footer>

        </div>
    );
}
