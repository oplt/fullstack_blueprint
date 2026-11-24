import { format } from "date-fns"
import { useState } from "react"
import { CalendarDaysIcon } from "lucide-react"
import type { DateRange, Matcher } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DateRangePickerProps = {
  value?: DateRange
  onChange?: (value: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  fromDate?: Date
  toDate?: Date
  "aria-label"?: string
}

function rangeLabel(value: DateRange | undefined, placeholder: string): string {
  if (!value?.from) return placeholder
  if (!value.to) return format(value.from, "PPP")
  return `${format(value.from, "PP")} – ${format(value.to, "PP")}`
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  disabled = false,
  className,
  fromDate,
  toDate,
  "aria-label": ariaLabel = placeholder,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const disabledDays: Matcher[] = []
  if (fromDate) disabledDays.push({ before: fromDate })
  if (toDate) disabledDays.push({ after: toDate })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !value?.from && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarDaysIcon className="mr-2 size-4" />
        {rangeLabel(value, placeholder)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={(next) => {
            onChange?.(next)
            if (next?.from && next.to) setOpen(false)
          }}
          numberOfMonths={2}
          disabled={disabledDays.length > 0 ? disabledDays : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
