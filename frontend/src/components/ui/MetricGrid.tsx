import { ResponsiveCardGrid, type ResponsiveCardColumns } from "./ResponsiveCardGrid";
type MetricGridProps = { children: React.ReactNode; columns?: ResponsiveCardColumns };
export function MetricGrid({ children, columns = 4 }: MetricGridProps) { return <ResponsiveCardGrid columns={columns}>{children}</ResponsiveCardGrid>; }
