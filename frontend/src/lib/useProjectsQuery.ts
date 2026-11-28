import { useQuery } from "@tanstack/react-query";
import { listProjects } from "@/features/projects/api";
import { capabilityAvailability, serverStateFromPlatformMetadata } from "./capabilities";
import { useApplicationConfiguration } from "./useConfiguration";
import { queryKeys } from "./queryKeys";
import { usePlatformMetadata } from "./usePlatformMetadata";

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
