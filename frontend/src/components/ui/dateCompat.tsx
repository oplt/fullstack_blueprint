import type { ReactNode } from "react";
export function LocalizationProvider({ children }: { children: ReactNode; dateAdapter?: unknown }) { return <>{children}</>; }
export function DateCalendar({ value, onChange }: { value?: any; onChange?: (newValue: any) => void; [key: string]: any }) { return <input type="date" value={value?.format?.("YYYY-MM-DD") ?? ""} onChange={event => onChange?.(event.target.value)} aria-label="Calendar date" />; }
export function PickersDay({ day, onDaySelect, ...props }: any) { return <button type="button" onClick={() => onDaySelect?.(day)} {...props}>{day?.date?.() ?? ""}</button>; }
export type PickersDayProps<T = any> = { day: T; selected?: boolean; outsideCurrentMonth?: boolean; onClick?: (event: any) => void; [key: string]: any };
export class AdapterDayjs {}
