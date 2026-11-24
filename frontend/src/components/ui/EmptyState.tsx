import type { ReactNode } from "react";
// Stable application wrapper; `empty.tsx` remains the lower-level shadcn composition API.
type EmptyStateProps = { icon: ReactNode; title: string; description: string; action?: ReactNode };
export function EmptyState({ icon, title, description, action }: EmptyStateProps) { return <div className="px-5 py-8 text-center"><div className="flex flex-col items-center gap-3"><div className="grid size-12 place-items-center text-muted-foreground">{icon}</div><h2 className="text-lg font-semibold">{title}</h2><p className="max-w-xl text-sm text-muted-foreground">{description}</p>{action ? <div className="pt-1">{action}</div> : null}</div></div>; }
