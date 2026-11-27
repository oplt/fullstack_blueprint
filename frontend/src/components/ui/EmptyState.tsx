import type { ReactNode } from "react";
type EmptyStateProps = { icon: ReactNode; title: string; description: string; action?: ReactNode };
export function EmptyState({ icon, title, description, action }: EmptyStateProps) { return <div className="ui-empty-state"><div className="ui-empty-content"><div className="ui-empty-icon">{icon}</div><h2 className="ui-empty-title">{title}</h2><p className="ui-empty-description">{description}</p>{action ? <div className="ui-empty-action">{action}</div> : null}</div></div>; }
