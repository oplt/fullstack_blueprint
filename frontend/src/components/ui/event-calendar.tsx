import { type CalendarOptions, useCalendarController } from '@fullcalendar/react'
import type { MouseEventHandler } from 'react'
import dayGridPlugin from '@fullcalendar/react/daygrid'
import interactionPlugin from '@fullcalendar/react/interaction'
import multiMonthPlugin from '@fullcalendar/react/multimonth'
import timeGridPlugin from '@fullcalendar/react/timegrid'
import { EventCalendarToolbar } from './event-calendar-toolbar'
import { EventCalendarViews } from '@/components/ui/event-calendar-views'
import { EventCalendarCloseIcon } from './event-calendar-icons'
import { cn } from '@/lib/utils'

const plugins = [
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
  multiMonthPlugin,
]
const defaultAvailableViews = [
  'dayGridMonth',
  'timeGridWeek',
  'timeGridDay',
  'multiMonthYear',
]
const navLinkDayClick = 'timeGridDay'
const navLinkWeekClick = 'timeGridWeek'

export interface EventCalendarProps extends Omit<CalendarOptions, 'class' | 'className' | 'headerToolbar' | 'footerToolbar'> {
  className?: string
  availableViews?: string[]
  eventsRevision?: number
  addButton?: {
    isPrimary?: boolean
    text?: string
    hint?: string
    click?: MouseEventHandler<HTMLButtonElement>
  }
}

function getContainerClassName(
  className: string | undefined,
  options: EventCalendarProps,
  isHeightAuto: boolean,
) {
  return cn(
    className,
    'flex flex-col bg-background',
    getBorderClasses(options),
    !isHeightAuto && 'overflow-hidden',
  )
}

function getBorderClasses(options: EventCalendarProps) {
  const borderless = options.borderless
  const hasBorderX = !(options.borderlessX ?? borderless)
  const hasBorderTop = !(options.borderlessTop ?? borderless)
  const hasBorderBottom = !(options.borderlessBottom ?? borderless)

  return cn(
    hasBorderX && 'border-x',
    hasBorderTop && 'border-t',
    hasBorderBottom && 'border-b',
    getRoundedBorderClasses(hasBorderTop, hasBorderBottom, hasBorderX),
  )
}

function getRoundedBorderClasses(hasBorderTop: boolean, hasBorderBottom: boolean, hasBorderX: boolean) {
  return cn(
    hasBorderTop && hasBorderX && 'rounded-t-lg',
    hasBorderBottom && hasBorderX && 'rounded-b-lg',
  )
}

export function EventCalendar({
  availableViews = defaultAvailableViews,
  addButton,
  eventsRevision,
  className,
  height,
  contentHeight,
  direction,
  plugins: userPlugins = [],
  ...restOptions
}: EventCalendarProps) {
  const controller = useCalendarController()
  const isHeightAuto = height === 'auto' || contentHeight === 'auto'

  return (
    <div
      className={getContainerClassName(className, restOptions, isHeightAuto)}
      style={{ height }}
      dir={direction === 'rtl' ? 'rtl' : undefined}
    >
      <EventCalendarToolbar
        className='p-ui-md'
        controller={controller}
        availableViews={availableViews}
        addButton={addButton}
      />
      <div className='grow min-h-0'>
        <EventCalendarViews
          controller={controller}
          height={isHeightAuto ? 'auto' : height !== undefined ? '100%' : contentHeight}
          initialView={availableViews[0]}
          navLinkDayClick={navLinkDayClick}
          navLinkWeekClick={navLinkWeekClick}
          eventsRevision={eventsRevision}
          plugins={[...plugins, ...userPlugins]}
          popoverCloseContent={() => (
            <EventCalendarCloseIcon />
          )}
          {...restOptions}
        />
      </div>
    </div>
  )
}
