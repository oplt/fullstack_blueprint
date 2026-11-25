import { FormField } from "@/components/ui/form-field";
import { SectionCard } from "../../../components/ui/SectionCard";
import { ENVIRONMENTS, SERVICES, TIME_RANGES } from "../observabilityModel";
import type { ObservabilityViewModel } from "../hooks/useObservabilityView";

type Props = Pick<ObservabilityViewModel, "filters" | "setters">;

export function InvestigationContextFields({ filters, setters }: Props) {
    return (
        <SectionCard
            title="Investigation context"
            description="These fields are passed as safe Grafana query parameters when a dashboard supports them."
        >
            <div style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "1fr",
            }}>
                <FormField as="select" label="Service" value={filters.service} onChange={(event: any) => setters.setService(event.target.value)}>
                    {SERVICES.map((item) => <option key={item}>{item}</option>)}
                </FormField>
                <FormField as="select" label="Environment" value={filters.environment} onChange={(event: any) => setters.setEnvironment(event.target.value)}>
                    {ENVIRONMENTS.map((item) => <option key={item}>{item}</option>)}
                </FormField>
                <FormField as="select" label="Time range" value={filters.timeRangeIndex} onChange={(event: any) => setters.setTimeRangeIndex(Number(event.target.value))}>
                    {TIME_RANGES.map((item) => <option key={item.from}>{item.label}</option>)}
                </FormField>
                <FormField label="Route" value={filters.route} onChange={(event: any) => setters.setRoute(event.target.value)} placeholder="/api/v1/users" />
                <FormField label="Job" value={filters.jobName} onChange={(event: any) => setters.setJobName(event.target.value)} placeholder="email" />
                <FormField label="Request or trace" value={filters.requestId} onChange={(event: any) => setters.setRequestId(event.target.value)} placeholder="request id" />
                <FormField label="Trace ID" value={filters.traceId} onChange={(event: any) => setters.setTraceId(event.target.value)} placeholder="trace id" />
            </div>
        </SectionCard>
    );
}
