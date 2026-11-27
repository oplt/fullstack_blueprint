import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
    return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>{children}</DialogPrimitive.Root>;
}
function SheetContent({ side = "right", title, description, className, children }: { side?: "left" | "right"; title: string; description: string; className?: string; children: ReactNode }) {
    return <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="ui-modal-backdrop ui-sheet-backdrop" />
        <DialogPrimitive.Popup data-side={side} className={cn("ui-sheet", className)}>
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
            {children}
        </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>;
}
export { Sheet, SheetContent };
