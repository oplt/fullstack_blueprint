import { Button } from "@/components/ui/button";
import { CheckCheck as DoneAllIcon } from "lucide-react";
import type { useNotificationMutations } from "../../hooks/useNotificationMutations";

type Props = { mutation: ReturnType<typeof useNotificationMutations>["markAll"] };

export function MarkAllReadButton({ mutation }: Props) {
    return (
        <div className="mb-4 flex justify-end">
            <Button
                variant="default"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                type="button"
            >
                <DoneAllIcon />
                {mutation.isPending ? "Updating..." : "Mark all read"}
            </Button>
        </div>
    );
}
