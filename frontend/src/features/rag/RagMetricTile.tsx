import { HelpTooltip } from "../../components/ui/HelpTooltip";
import { Card, CardContent } from "../../components/ui/card";
type RagMetricTileProps = { label: string; value: string | number; helpTermId?: string; description?: string };
export function RagMetricTile({ label, value, helpTermId, description }: RagMetricTileProps) {
    return <Card size="sm" variant="subtle" className="h-full"><CardContent>
        <dl><dt className="ui-metric-label">{helpTermId ? <HelpTooltip termId={helpTermId} variant="label">{label}</HelpTooltip> : label}</dt><dd className="ui-metric-value">{value}</dd></dl>
        {description && <p className="ui-metric-label">{description}</p>}
    </CardContent></Card>;
}
