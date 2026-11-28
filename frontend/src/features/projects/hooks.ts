import { useQuery } from "@tanstack/react-query";
import { listProjects } from "./api";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "@/lib/capabilities";
import { useApplicationConfiguration } from "@/app/configuration";
import { queryKeys } from "@/lib/queryKeys";
import { usePlatformMetadata } from "@/features/platform/hooks";

export function useProjectsQuery() {
    const configuration = useApplicationConfiguration();
    const { data: platformMetadata } = usePlatformMetadata();
    const enabled = capabilityAvailability(
        "projects",
        configuration,
        serverStateFromPlatformMetadata(platformMetadata),
    ).available;
    const query = useQuery({
        queryKey: queryKeys.projects.all,
        queryFn: ({ signal }) => listProjects({ signal }),
        enabled,
    });
    return { enabled, query };
}
