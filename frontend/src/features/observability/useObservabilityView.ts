import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../lib/queryKeys";
import { useAuth } from "../identity/useAuth";
import { getObservabilityLinks, getObservabilityStatus } from "./api";
import { buildHealthItems, buildObservabilityContext } from "./observabilityModel";

export function useObservabilityView() {
    const { isAdmin } = useAuth();
    const [service, setService] = useState("backend");
    const [environment, setEnvironment] = useState("local");
    const [route, setRoute] = useState("");
    const [jobName, setJobName] = useState("");
    const [traceId, setTraceId] = useState("");
    const [requestId, setRequestId] = useState("");
    const [timeRangeIndex, setTimeRangeIndex] = useState(1);
    const linksQuery = useQuery({
        queryKey: queryKeys.observability.links,
        queryFn: ({ signal }) => getObservabilityLinks({ signal }),
        staleTime: 5 * 60_000,
    });
    const statusQuery = useQuery({
        queryKey: queryKeys.observability.status,
        queryFn: ({ signal }) => getObservabilityStatus({ signal }),
        refetchInterval: 60_000,
    });
    const context = useMemo(
        () => buildObservabilityContext({ service, environment, route, jobName, traceId, requestId, timeRangeIndex }),
        [environment, jobName, requestId, route, service, timeRangeIndex, traceId],
    );

    return {
        filters: { service, environment, route, jobName, traceId, requestId, timeRangeIndex },
        setters: { setService, setEnvironment, setRoute, setJobName, setTraceId, setRequestId, setTimeRangeIndex },
        linksQuery,
        statusQuery,
        context,
        healthItems: buildHealthItems(statusQuery.data),
        isAdmin,
        technicalAccess: isAdmin && (linksQuery.data?.grafana_base_url.allowed ?? false),
    };
}

export type ObservabilityViewModel = ReturnType<typeof useObservabilityView>;
