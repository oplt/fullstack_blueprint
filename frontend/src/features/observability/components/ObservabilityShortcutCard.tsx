import { Button } from "@/components/ui/button";
import { OpenInNew as OpenInNewIcon } from "@/components/ui/iconsCompat";
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
            <div className="flex gap-[16px]" style={{ width: "100%" }}>
                <div className="flex flex-row gap-[12px] items-center justify-between">
                    <h6>{title}</h6>
                    {icon}
                </div>
                <p style={{ flexGrow: 1 }} className="text-muted-foreground">
                    {description}
                </p>
                <div className="flex flex-row gap-[12px] items-center justify-between">
                    {disabledReason ? (
                        <div
                            className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs">{disabledReason}</div>
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
