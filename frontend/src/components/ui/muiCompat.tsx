import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from "react";
import { inlineStyle, type StyleCompat } from "./styleCompat";

interface Props { children?: ReactNode; sx?: StyleCompat; component?: ElementType; className?: string; onChange?: (event: any, value?: any) => void; onClick?: (event: any) => void; [key: string]: any }
const clean = (props: Props) => { const { sx, component, startIcon, endIcon, endAdornment, inputProps, InputProps, helperText, error, variant, size, color, ...rest } = props; return rest; };
const element = (props: Props, fallback: ElementType = "div") => props.component ?? fallback;

export const Box = forwardRef<HTMLElement, Props>(function Box(props, ref) { const Tag = element(props); return <Tag ref={ref} {...clean(props)} style={{ ...inlineStyle(props.sx), ...props.style }}>{props.children}</Tag>; });
export function Stack({ children, direction, spacing, alignItems, justifyContent, ...props }: Props) { return <Box {...props} className={`flex ${direction === "row" ? "flex-row" : "flex-col"} ${props.className ?? ""}`} style={{ gap: typeof spacing === "number" ? `${spacing * 8}px` : spacing, alignItems, justifyContent, ...props.style }}>{children}</Box>; }
export function Typography({ children, variant, component, color, ...props }: Props) { const Tag = component ?? (variant?.startsWith("h") ? variant : variant === "body2" ? "p" : "span"); const colorClass = color === "text.secondary" ? "text-muted-foreground" : color === "primary.main" ? "text-primary" : ""; return <Tag {...clean(props)} className={`${colorClass} ${props.className ?? ""}`} style={{ ...inlineStyle(props.sx), ...props.style }}>{children}</Tag>; }
export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ children, startIcon, endIcon, href, ...props }, ref) { const Tag = href ? "a" : "button"; return <Tag ref={ref as any} href={href} {...clean(props)} className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:pointer-events-none disabled:opacity-50 ${props.className ?? ""}`} style={{ ...inlineStyle(props.sx), ...props.style }}>{startIcon}{children}{endIcon}</Tag>; });
export function IconButton({ children, ...props }: Props) { return <Button {...props} aria-label={props["aria-label"]} className={`!rounded-full !p-2 ${props.className ?? ""}`}>{children}</Button>; }
export function Alert({ children, severity = "info", ...props }: Props) { return <div role="alert" {...clean(props)} className={`rounded-lg border p-3 text-sm ${severity === "error" ? "border-destructive/40 text-destructive" : severity === "success" ? "border-green-500/40 text-green-700" : "border-border"} ${props.className ?? ""}`}>{children}</div>; }
export function Chip({ label, children, onDelete, ...props }: Props) { return <span {...clean(props)} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${props.className ?? ""}`}>{label ?? children}{onDelete ? <button type="button" aria-label="Remove" onClick={onDelete}>×</button> : null}</span>; }
export function Skeleton({ height, width, variant, ...props }: Props) { return <div {...clean(props)} className={`animate-pulse rounded-md bg-muted ${variant === "circular" ? "rounded-full" : ""} ${props.className ?? ""}`} style={{ height: height ?? "1.25rem", width: width ?? "100%", ...props.style }} />; }
export function CircularProgress({ size = 24 }: Props) { return <span aria-label="Loading" role="progressbar" className="inline-block animate-spin rounded-full border-2 border-primary border-t-transparent" style={{ width: size, height: size }} />; }
export function Paper({ children, ...props }: Props) { return <div {...clean(props)} className={`rounded-xl border border-border bg-card p-4 ${props.className ?? ""}`}>{children}</div>; }
export function Container({ children, ...props }: Props) { return <div {...clean(props)} className={`mx-auto w-full max-w-6xl px-4 ${props.className ?? ""}`}>{children}</div>; }
export function Divider(props: Props) { return <hr {...clean(props)} className={`border-border ${props.className ?? ""}`} />; }
export function Collapse({ children, in: open = true }: Props) { return open ? <div>{children}</div> : null; }
export function InputAdornment({ children }: Props) { return <span className="inline-flex items-center">{children}</span>; }
export function MenuItem({ children, value, ...props }: Props) { return <option value={value} {...clean(props)}>{children}</option>; }
export function Switch({ checked, onChange, ...props }: Props) { return <input type="checkbox" role="switch" checked={checked} onChange={onChange} {...clean(props)} />; }
export function FormControlLabel({ control, label }: Props) { return <label className="flex items-center gap-2">{control}{label}</label>; }
export function Avatar({ children, src, alt = "", ...props }: Props) { return src ? <img src={src} alt={alt} {...clean(props)} className={`h-10 w-10 rounded-full object-cover ${props.className ?? ""}`} /> : <span {...clean(props)} className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm ${props.className ?? ""}`}>{children}</span>; }
export function Link({ children, href, ...props }: Props) { return <a href={href} {...clean(props)} className={`text-primary underline-offset-4 hover:underline ${props.className ?? ""}`}>{children}</a>; }
export function TextField({ label, helperText, error, multiline, select, children, InputProps, inputProps, ...props }: Props) { const Field = multiline ? "textarea" : select ? "select" : "input"; return <label className="block space-y-1"><span className="text-sm font-medium">{label}</span><Field {...clean(props)} {...inputProps} {...(InputProps?.inputProps ?? {})} aria-invalid={error || undefined} className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${props.className ?? ""}`} rows={multiline ? props.rows ?? 4 : undefined}>{select ? children : undefined}</Field>{helperText ? <span className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>{helperText}</span> : null}</label>; }
export function Drawer({ open, onClose, children, ...props }: Props) { if (!open) return null; return <div className="fixed inset-0 z-50"><button className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} /><aside {...clean(props)} className={`absolute right-0 top-0 h-full w-full max-w-lg overflow-auto bg-card p-5 shadow-xl ${props.className ?? ""}`}>{children}</aside></div>; }
export function Tooltip({ title, children }: Props) { return <span title={typeof title === "string" ? title : undefined}>{children}</span>; }
export function Badge({ children, badgeContent }: Props) { return <span className="relative inline-flex">{children}{badgeContent ? <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{badgeContent}</span> : null}</span>; }
export function Tabs({ children, value, onChange, ...props }: Props) { return <div role="tablist" {...clean(props)} className={`flex gap-1 border-b ${props.className ?? ""}`}>{children}</div>; }
export function Tab({ label, children, ...props }: Props) { return <button role="tab" type="button" {...clean(props)}>{label ?? children}</button>; }
export const Table = (props: HTMLAttributes<HTMLTableElement> & Props) => <table {...clean(props as Props)} className={`w-full text-sm ${props.className ?? ""}`}>{props.children}</table>;
export const TableHead = ({ children, ...props }: Props) => <thead {...clean(props)}>{children}</thead>;
export const TableBody = ({ children, ...props }: Props) => <tbody {...clean(props)}>{children}</tbody>;
export const TableRow = ({ children, ...props }: Props) => <tr {...clean(props)} className={`border-b border-border ${props.className ?? ""}`}>{children}</tr>;
export const TableCell = ({ children, ...props }: Props) => <td {...clean(props)} className={`p-2 align-top ${props.className ?? ""}`}>{children}</td>;
export const TableContainer = ({ children, ...props }: Props) => <div {...clean(props)} className="overflow-auto">{children}</div>;
export function TablePagination({ count, page, rowsPerPage, onPageChange, ...props }: Props) { return <div {...clean(props)} className="flex items-center justify-end gap-3 p-2 text-sm"><span>{count} items</span><button disabled={page <= 0} onClick={e => onPageChange?.(e, page - 1)}>Previous</button><button disabled={(page + 1) * rowsPerPage >= count} onClick={e => onPageChange?.(e, page + 1)}>Next</button></div>; }
export function Checkbox(props: Props) { return <input type="checkbox" {...clean(props)} />; }
export function useMediaQuery(_query?: unknown) { return typeof window !== "undefined" && window.matchMedia?.("(max-width: 768px)").matches; }
export function useTheme() { return { breakpoints: { down: () => "(max-width: 768px)" }, palette: { mode: "light", divider: "var(--border)", common: { white: "#fff", black: "#000" }, text: { primary: "var(--foreground)", secondary: "var(--muted-foreground)" }, background: { paper: "var(--card)" }, primary: { main: "var(--primary)", light: "var(--primary)" }, success: { main: "#16a34a" }, warning: { main: "#d97706" }, error: { main: "#dc2626" }, info: { main: "#0284c7" }, action: { hover: "color-mix(in srgb, var(--foreground) 5%, transparent)" } }, spacing: (value: number) => value * 8, transitions: { create: () => "all 150ms ease" } } as any; }
export function alpha(color: string, opacity: number) { return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`; }
export type PaletteMode = "light" | "dark";
export type Theme = ReturnType<typeof useTheme>;
export type SxProps<_T = Theme> = StyleCompat;
export function ThemeProvider({ children }: Props) { return <>{children}</>; }
export function CssBaseline() { return null; }
export function Snackbar({ children }: Props) { return <>{children}</>; }
export function createTheme(value: any = {}, ...args: any[]) { const result = args.reduce((current, next) => ({ ...current, ...next, palette: { ...current.palette, ...next.palette }, components: { ...current.components, ...next.components } }), value); return { ...result, palette: { ...result.palette, common: { white: "#fff", black: "#000", ...result.palette?.common } } }; }
export type AlertColor = "error" | "warning" | "info" | "success";
export type TextFieldProps = Props;
export function Dialog({ open, children, ...props }: Props) { return open ? <div role="dialog" aria-modal="true" {...clean(props)} className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-card p-5 shadow-xl">{children}</div></div> : null; }
export function DialogTitle({ children }: Props) { return <h2 className="mb-3 text-lg font-semibold">{children}</h2>; }
export function DialogContent({ children }: Props) { return <div>{children}</div>; }
export function DialogActions({ children }: Props) { return <div className="mt-4 flex justify-end gap-2">{children}</div>; }
