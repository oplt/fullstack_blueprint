import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
type ObservabilityShortcutCardProps = { title: string; description: string; buttonText: string; url: string | null; allowed: boolean; configured: boolean; onOpen: (url: string) => void; icon: ReactNode };
export function ObservabilityShortcutCard({ title, description, buttonText, url, allowed, configured, onOpen, icon }: ObservabilityShortcutCardProps) {
    const disabledReason = !allowed ? "Admin only" : !configured || !url ? "Not configured" : null;
    return <Card className="ui-shortcut-card"><CardHeader className="ui-health-header"><CardTitle as="h3">{title}</CardTitle>{icon}</CardHeader><CardContent className="ui-shortcut-content">
        <p className="flex-1 text-body-md text-muted-foreground">{description}</p>
        <div className="flex flex-wrap items-center justify-between gap-ui-sm">{disabledReason ? <Badge variant="outline">{disabledReason}</Badge> : <span />}
            <Button variant="default" disabled={Boolean(disabledReason) || !url} onClick={() => { if (url) onOpen(url); }} type="button">{buttonText}<ExternalLink /></Button>
        </div>
    </CardContent></Card>;
}
