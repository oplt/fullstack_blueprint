import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";
function AlertDialog(props: AlertDialogPrimitive.Root.Props) { return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />; }
function AlertDialogTrigger(props: AlertDialogPrimitive.Trigger.Props) { return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />; }
function AlertDialogClose(props: AlertDialogPrimitive.Close.Props) { return <AlertDialogPrimitive.Close data-slot="alert-dialog-close" {...props} />; }
function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.Popup.Props) {
    return <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-backdrop" className="ui-modal-backdrop" />
        <AlertDialogPrimitive.Popup data-slot="alert-dialog-content" className={cn("ui-modal ui-alert-dialog", className)} {...props} />
    </AlertDialogPrimitive.Portal>;
}
function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) { return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("ui-dialog-title", className)} {...props} />; }
function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) { return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("ui-dialog-description", className)} {...props} />; }
export { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger };
