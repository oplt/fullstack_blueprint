import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

function Sheet({ open, onOpenChange, children }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
}) {
    return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>{children}</DialogPrimitive.Root>;
}

function SheetContent({ side = "right", title, description, className, children }: {
    side?: "left" | "right";
    title: string;
    description: string;
    className?: string;
    children: ReactNode;
}) {
    return <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 md:hidden" />
        <DialogPrimitive.Popup className={cn(
            "fixed inset-y-0 z-50 flex w-72 flex-col border-border bg-card shadow-xl outline-none md:hidden",
            side === "left" ? "left-0 border-r" : "right-0 border-l", className,
        )}>
            <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
            {children}
        </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>;
}

export { Sheet, SheetContent };
