import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";
const Toaster = ({ ...props }: ToasterProps) => <Sonner className="toaster group" icons={{ success: <CircleCheckIcon className="ui-toast-icon" />, info: <InfoIcon className="ui-toast-icon" />, warning: <TriangleAlertIcon className="ui-toast-icon" />, error: <OctagonXIcon className="ui-toast-icon" />, loading: <Loader2Icon className="ui-spinner" /> }} toastOptions={{ classNames: { toast: "cn-toast" } }} {...props} />;
export { Toaster };
