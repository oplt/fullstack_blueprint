import { ChevronDownIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from '@/lib/utils'

export function EventCalendarPrevIcon() {
  return (
    <ChevronLeftIcon className="ui-auto-event-calendar-icons-event-calendar-prev-icon-chevron-left-icon" />
  )
}

export function EventCalendarNextIcon() {
  return (
    <ChevronRightIcon className="ui-auto-event-calendar-icons-event-calendar-next-icon-chevron-right-icon" />
  )
}

const hoverIconClassName = "ui-auto-event-calendar-icons-hover-icon-class-name"

export function EventCalendarCloseIcon() {
  return (
    <XIcon className={`size-5 ${hoverIconClassName}`} />
  )
}

export function EventCalendarExpanderIcon(props: { isExpanded: boolean }) {
  return (
    <ChevronDownIcon
      className={cn(
        `size-4 m-px ${hoverIconClassName}`,
        !props.isExpanded && "ui-auto-event-calendar-icons-event-calendar-expander-icon-chevron-down-icon"
      )}
    />
  )
}
