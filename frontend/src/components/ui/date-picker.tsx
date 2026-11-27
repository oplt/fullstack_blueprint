import { format } from "date-fns"
import { useState } from "react"
import type { Matcher } from "react-day-picker"
import { CalendarDaysIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DatePickerProps = {
  value?: Date
  onChange?: (value: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  fromDate?: Date
  toDate?: Date
  "aria-label"?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  fromDate,
  toDate,
  "aria-label": ariaLabel = placeholder,
}: DatePickerProps) {
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
              "w-[240px] justify-start rounded-sm bg-card text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarDaysIcon className="mr-2 size-4" />
        {value ? format(value, "PPP") : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(next) => {
            onChange?.(next)
            if (next) setOpen(false)
          }}
          disabled={disabledDays.length > 0 ? disabledDays : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
