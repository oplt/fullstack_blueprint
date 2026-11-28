import type { CalendarController } from '@fullcalendar/react'
import type { MouseEventHandler } from 'react'
import { EventCalendarNextIcon, EventCalendarPrevIcon } from './event-calendar-icons'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export interface EventCalendarToolbarProps {
  className?: string
  controller: CalendarController
  availableViews: string[]
  addButton?: {
    isPrimary?: boolean
    text?: string
    hint?: string
    click?: MouseEventHandler<HTMLButtonElement>
  }
}

export function EventCalendarToolbar({
  className,
  controller,
  availableViews,
  addButton,
}: EventCalendarToolbarProps) {
  const buttons = controller.getButtonState()

  return (
    <div className={cn('flex items-center justify-between flex-wrap gap-ui-sm', className)}>
      <div className='flex items-center shrink-0 gap-ui-sm'>
        {addButton && (
          <Button
            onClick={addButton.click}
            aria-label={addButton.hint}
          >{addButton.text}</Button>
        )}
        <Button
          onClick={() => controller.today()}
          aria-label={buttons.today.hint}
          variant='outline'
        >{buttons.today.text}</Button>
        <div className='flex items-center'>
          <Button
            onClick={() => controller.prev()}
            disabled={buttons.prev.isDisabled}
          aria-label={buttons.prev.hint?.trim() ? buttons.prev.hint : 'Previous'}
            variant='ghost'
            size='icon'
          >
            <EventCalendarPrevIcon />
          </Button>
          <Button
            onClick={() => controller.next()}
            disabled={buttons.next.isDisabled}
          aria-label={buttons.next.hint?.trim() ? buttons.next.hint : 'Next'}
            variant='ghost'
            size='icon'
          >
            <EventCalendarNextIcon />
          </Button>
        </div>
        <div className='text-display-md'>{controller.view?.title}</div>
      </div>
      {availableViews.length > 1 && (
        <Tabs value={controller.view?.type ?? availableViews[0]}>
          <TabsList>
            {availableViews.map((availableView) => (
              <TabsTrigger
                key={availableView}
                value={availableView}
                onClick={() => controller.changeView(availableView)}
                aria-label={buttons[availableView]?.hint ?? buttons[availableView]?.text ?? availableView}
              >{buttons[availableView]?.text}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  )
}
