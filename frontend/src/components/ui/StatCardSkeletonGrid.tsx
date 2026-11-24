import { MetricGrid } from "./MetricGrid";
export function StatCardSkeletonGrid({ count = 4 }: { count?: number }) { const columns = count >= 4 ? 4 : count === 3 ? 3 : 2; return <MetricGrid columns={columns}>{Array.from({ length: count }).map((_: any, index: any) => <div key={index} className="animate-pulse rounded-md bg-muted h-[120px] w-full rounded-xl" />)}</MetricGrid>; }
