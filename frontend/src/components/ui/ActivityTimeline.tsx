import { CheckCircle2, Circle, Clock3 } from "lucide-react";

export type ActivityItem = {
    id: string;
    title: string;
    description?: string;
    timestamp?: string;
    status?: "complete" | "active" | "pending";
};

export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
    return (
        <ol aria-label="Activity timeline" className="space-y-4">
            {items.map((item) => (
                <li key={item.id} className="relative flex gap-3">
                    <span className="mt-0.5 text-muted-foreground">
                        <span className="sr-only">
                            {item.status === "complete" ? "Complete" : item.status === "active" ? "Active" : "Pending"}
                        </span>
                        {item.status === "complete" ? <CheckCircle2 aria-hidden="true" className="size-4 text-success-deep" />
                            : item.status === "active" ? <Clock3 aria-hidden="true" className="size-4 text-success-deep" />
                                : <Circle aria-hidden="true" className="size-4" />}
                    </span>
                    <div className="min-w-0">
                        <p className="font-medium">{item.title}</p>
                        {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
                        {item.timestamp ? <time className="text-xs text-muted-foreground">{item.timestamp}</time> : null}
                    </div>
                </li>
            ))}
        </ol>
    );
}
