import { MetricGrid } from "./MetricGrid";
import { Skeleton } from "./skeleton";
export function StatCardSkeletonGrid({ count = 4 }: { count?: number }) { const columns = count >= 4 ? 4 : count === 3 ? 3 : 2; return <MetricGrid columns={columns}>{Array.from({ length: count }).map((_, index) => <Skeleton key={index} className="ui-stat-card-skeleton" />)}</MetricGrid>; }
