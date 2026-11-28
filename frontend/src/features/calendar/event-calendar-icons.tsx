import { XIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from '@/lib/utils'

export function EventCalendarPrevIcon() {
  return (
    <ChevronLeftIcon className='[[dir=rtl]_&]:rotate-180' />
  )
}

export function EventCalendarNextIcon() {
  return (
    <ChevronRightIcon className='[[dir=rtl]_&]:rotate-180' />
  )
}

const hoverIconClassName = 'text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground'

export function EventCalendarCloseIcon() {
  return (
    <XIcon className={cn('size-(--icon-size-lg)', hoverIconClassName)} />
  )
}
