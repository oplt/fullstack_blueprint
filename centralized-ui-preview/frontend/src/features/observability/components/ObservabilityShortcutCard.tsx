import { Button } from "@/components/ui/button";
import { ExternalLink as OpenInNewIcon } from "lucide-react";
import type { ReactNode } from "react";

type ObservabilityShortcutCardProps = {
    title: string;
    description: string;
    buttonText: string;
    url: string | null;
    allowed: boolean;
    configured: boolean;
    onOpen: (url: string) => void;
    icon: ReactNode;
};

export function ObservabilityShortcutCard({
    title,
    description,
    buttonText,
    url,
    allowed,
    configured,
    onOpen,
    icon,
}: ObservabilityShortcutCardProps) {
    const disabledReason = !allowed ? "Admin only" : !configured || !url ? "Not configured" : null;

    return (
        <div
            style={({
                padding: 20,
                borderRadius: 4,
                border: "none",
                boxShadow: "none",
                minHeight: 218,
                display: "flex",

                backgroundColor: "var(--card)"
            })}
        >
            <div className="flex gap-ui-md" style={{ width: "100%" }}>
                <div className="flex flex-row items-center justify-between gap-ui-sm">
                    <h6>{title}</h6>
                    {icon}
                </div>
                <p style={{ flexGrow: 1 }} className="text-muted-foreground">
                    {description}
                </p>
                <div className="flex flex-row items-center justify-between gap-ui-sm">
                    {disabledReason ? (
                        <div
                            className="inline-flex items-center ui-auto-observability-shortcut-card-div">{disabledReason}</div>
                    ) : (
                        <span />
                    )}
                    <Button
                        variant="default"
                        disabled={Boolean(disabledReason) || !url}
                        onClick={() => {
                            if (url) {
                                onOpen(url);
                            }
                        }}
                        type="button"
                    >
                        {buttonText}
                        <OpenInNewIcon /></Button>
                </div>
            </div>
        </div>
    );
}
