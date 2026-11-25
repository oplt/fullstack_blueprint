import { HelpTooltip } from "../../../components/ui/HelpTooltip";

type RagMetricTileProps = {
    label: string;
    value: string | number;
    helpTermId?: string;
    description?: string;
};

export function RagMetricTile({ label, value, helpTermId, description }: RagMetricTileProps) {
    return (
        <div className="metric-tile h-full">
            <span className="text-muted-foreground">
                {helpTermId ? (
                    <HelpTooltip termId={helpTermId} variant="label">{label}</HelpTooltip>
                ) : label}
            </span>
            <h6>{value}</h6>
            {description ? <span className="text-muted-foreground">{description}</span> : null}
        </div>
    );
}
