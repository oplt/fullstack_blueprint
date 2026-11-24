import { useId, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inlineStyle, type StyleCompat } from "./styleCompat";

export type PageHeaderOverflowItem = { id: string; label: ReactNode; onClick: () => void; disabled?: boolean };
type PageHeaderProps = { title: ReactNode; description?: ReactNode; status?: ReactNode; primaryAction?: ReactNode; secondaryActions?: ReactNode; overflowItems?: PageHeaderOverflowItem[]; actions?: ReactNode; icon?: ReactNode; dense?: boolean; sx?: StyleCompat };

export function PageHeader({ title, description, status, primaryAction, secondaryActions, overflowItems, actions, icon, dense = false, sx }: PageHeaderProps) {
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const hasActions = Boolean(primaryAction || secondaryActions || actions || overflowItems?.length);
    return <header className="mb-6 flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-start" style={inlineStyle(sx)}>
        <div className="flex min-w-0 items-start gap-3">{icon ? <span className="mt-1 flex shrink-0 text-primary">{icon}</span> : null}<div className="min-w-0"><h1 className={dense ? "text-xl font-semibold tracking-tight" : "text-2xl font-semibold tracking-tight"}>{title}</h1>{description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}{status ? <div className="mt-2">{status}</div> : null}</div></div>
        {hasActions ? <div className="relative flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">{secondaryActions}{actions}{primaryAction}{overflowItems?.length ? <><Button variant="ghost" size="icon" aria-label="More actions" aria-controls={menuId} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MoreVertical className="size-4" /></Button>{open ? <div id={menuId} role="menu" className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-lg border border-border bg-popover p-1 shadow-lg">{overflowItems.map((item) => <button key={item.id} type="button" role="menuitem" disabled={item.disabled} onClick={() => { setOpen(false); item.onClick(); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50">{item.label}</button>)}</div> : null}</> : null}</div> : null}
    </header>;
}
