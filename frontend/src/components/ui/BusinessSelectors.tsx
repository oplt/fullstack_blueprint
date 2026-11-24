import { useId } from "react";
import { Input } from "./input";

export type SelectorOption = { id: string; label: string; description?: string };
export function UserSelector({ label = "User", value, options, onChange, disabled = false }: { label?: string; value?: string; options: SelectorOption[]; onChange: (value: string) => void; disabled?: boolean }) { const id = useId(); return <label htmlFor={id} className="grid gap-1.5 text-sm"><span className="font-medium">{label}</span><select id={id} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="h-8 rounded-lg border border-input bg-background px-2.5"><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>; }
export function TeamSelector(props: Omit<React.ComponentProps<typeof UserSelector>, "label"> & { label?: string }) { return <UserSelector {...props} label={props.label ?? "Team"} />; }
export function DashboardFilters({ query, onQueryChange, children }: { query?: string; onQueryChange?: (query: string) => void; children?: React.ReactNode }) { return <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3"><label className="grid min-w-52 gap-1 text-xs font-medium text-muted-foreground">Search{onQueryChange ? <Input value={query ?? ""} onChange={(event) => onQueryChange(event.target.value)} placeholder="Filter dashboard" /> : null}</label>{children}</div>; }

