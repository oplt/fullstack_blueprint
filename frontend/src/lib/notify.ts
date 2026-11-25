import { toast } from "sonner";

type Notification = { message: string; severity?: "error" | "warning" | "info" | "success" };

export function notify({ message, severity = "info" }: Notification): void {
    toast[severity](message);
}
