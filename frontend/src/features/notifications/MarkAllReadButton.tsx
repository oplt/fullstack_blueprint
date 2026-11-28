import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import type { useNotificationMutations } from "./useNotificationMutations";

type Props = { mutation: ReturnType<typeof useNotificationMutations>["markAll"] };

export function MarkAllReadButton({ mutation }: Props) {
    return (
        <div className="mb-ui-md flex justify-end">
            <Button
                variant="default"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
                type="button"
            >
                <CheckCheck />
                {mutation.isPending ? "Updating..." : "Mark all read"}
            </Button>
        </div>
    );
}
