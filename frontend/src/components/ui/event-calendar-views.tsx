import FullCalendar, { type CalendarOptions, type CalendarRef, type DayCellInfo } from '@fullcalendar/react';
import { useEffect, useRef } from 'react';
import '@fullcalendar/react/skeleton.css';
import { cn } from '@/lib/utils';

// FullCalendar owns event placement and interaction geometry. Static recipes live in index.css.
const getShortDayCellBottomClass = (info: DayCellInfo) => cn(!info.isNarrow && 'ui-fc-day-bottom-short');
const dayRowCommonClasses: CalendarOptions = {
    listItemEventClass: (info) => cn('ui-fc-list-item', info.isNarrow ? 'ui-fc-list-item-narrow' : 'ui-fc-list-item-wide'),
    listItemEventBeforeClass: (info) => cn('ui-fc-list-item-dot', info.isNarrow ? 'ui-fc-list-dot-narrow' : 'ui-fc-list-dot-wide'),
    listItemEventInnerClass: (info) => info.isNarrow ? 'ui-fc-list-inner-narrow' : 'ui-fc-list-inner-wide',
    listItemEventTimeClass: (info) => cn('ui-fc-list-time', info.isNarrow ? 'ui-fc-list-time-narrow' : 'ui-fc-list-time-wide'),
    listItemEventTitleClass: (info) => cn('ui-fc-list-title', info.isNarrow ? 'ui-fc-list-title-narrow' : 'ui-fc-list-title-wide'),
    rowEventClass: (info) => cn(info.isStart && 'ui-fc-row-start', info.isEnd && 'ui-fc-row-end'),
    rowEventInnerClass: (info) => info.isNarrow ? 'ui-fc-row-inner-narrow' : 'ui-fc-row-inner-wide',
    rowMoreLinkClass: (info) => cn('ui-fc-row-more', info.isNarrow ? 'ui-fc-row-more-narrow' : 'ui-fc-row-more-wide'),
    rowMoreLinkInnerClass: (info) => info.isNarrow ? 'ui-fc-row-more-inner-narrow' : 'ui-fc-row-more-inner-wide',
};
export type EventCalendarViewProps = CalendarOptions & { eventsRevision?: number } & Required<Pick<CalendarOptions, 'popoverCloseContent'>>;
export function EventCalendarViews({ views: userViews, eventsRevision, ...restOptions }: EventCalendarViewProps) {
    const calendarRef = useRef<CalendarRef>(null);
    const previousEventsRevision = useRef(eventsRevision);
    useEffect(() => {
        if (eventsRevision !== undefined && previousEventsRevision.current !== eventsRevision) calendarRef.current?.getApi().refetchEvents();
        previousEventsRevision.current = eventsRevision;
    }, [eventsRevision]);
    return <FullCalendar ref={calendarRef}
        eventShortHeight={50}
        eventColor='var(--primary)'
        eventContrastColor='var(--primary-foreground)'
        eventClass={(info) => cn('ui-fc-event-focus', info.isSelected ? ['ui-fc-event-selected', info.isDragging ? 'ui-fc-event-drag-shadow' : 'ui-fc-event-selected-shadow'] : 'ui-fc-event-unselected')}
        backgroundEventColor='var(--chart-3)'
        backgroundEventClass='ui-fc-background-event'
        backgroundEventTitleClass={(info) => cn('ui-fc-background-title', info.isNarrow ? 'ui-fc-background-title-narrow' : 'ui-fc-background-title-wide')}
        listItemEventClass={(info) => cn('items-center', info.isSelected ? 'ui-fc-list-selected' : 'ui-fc-list-hover')}
        listItemEventBeforeClass='ui-fc-list-dot'
        listItemEventInnerClass='flex flex-row items-center'
        blockEventClass={(info) => cn('group ui-fc-block', info.isInteractive && 'ui-fc-block-interactive', (!info.isSelected && info.isDragging) && 'ui-fc-block-dragging')}
        blockEventInnerClass='ui-fc-block-inner'
        blockEventTimeClass='whitespace-nowrap overflow-hidden'
        blockEventTitleClass='whitespace-nowrap overflow-hidden'
        rowEventClass={(info) => cn('ui-fc-row-event', info.isStart ? 'ui-fc-row-event-start' : (!info.isNarrow && 'ui-fc-row-event-continued-start'), info.isEnd ? 'ui-fc-row-event-end' : (!info.isNarrow && 'ui-fc-row-event-continued-end'))}
        rowEventBeforeClass={(info) => info.isStartResizable ? cn(info.isSelected ? 'ui-fc-row-touch' : 'ui-fc-row-pointer', 'ui-fc-row-resize-start') : (!info.isStart && !info.isNarrow) ? 'ui-fc-row-continuation-start' : ''}
        rowEventBeforeContent={(info) => (!info.isStart && !info.isNarrow) ? filledRightTriangle('ui-fc-triangle-start') : <></>}
        rowEventAfterClass={(info) => info.isEndResizable ? cn(info.isSelected ? 'ui-fc-row-touch' : 'ui-fc-row-pointer', 'ui-fc-row-resize-end') : (!info.isEnd && !info.isNarrow) ? 'ui-fc-row-continuation-end' : ''}
        rowEventAfterContent={(info) => (!info.isEnd && !info.isNarrow) ? filledRightTriangle('ui-fc-triangle-end') : <></>}
        rowEventInnerClass={(info) => cn('flex flex-row items-center', info.isNarrow ? 'ui-fc-text-compact' : 'ui-fc-text-small')}
        rowEventTimeClass={(info) => cn('ui-fc-row-time', info.isNarrow ? 'ui-fc-list-time-narrow' : 'ui-fc-list-time-wide')}
        rowEventTitleClass={(info) => cn('shrink-100', info.isNarrow ? 'ui-fc-list-title-narrow' : 'ui-fc-list-title-wide')}
        columnEventTitleSticky={false}
        columnEventClass={(info) => cn('ui-fc-column-event', info.isStart && 'ui-fc-column-event-start', info.isEnd && 'ui-fc-column-event-end')}
        columnEventBeforeClass={(info) => cn(info.isStartResizable && [info.isSelected ? 'ui-fc-column-touch' : 'ui-fc-column-pointer', 'ui-fc-column-resize-start'])}
        columnEventAfterClass={(info) => cn(info.isEndResizable && [info.isSelected ? 'ui-fc-column-touch' : 'ui-fc-column-pointer', 'ui-fc-column-resize-end'])}
        columnEventInnerClass={(info) => cn('flex', info.isShort ? 'ui-fc-column-short' : ['flex-col', info.isNarrow ? 'ui-fc-column-narrow' : 'ui-fc-column-wide'], (info.isShort || info.isNarrow) ? 'ui-fc-text-compact' : 'ui-fc-text-small')}
        columnEventTimeClass={(info) => cn('order-1 shrink-100', !info.isShort && (info.isNarrow ? 'ui-fc-column-time-narrow' : 'ui-fc-column-time-wide'))}
        columnEventTitleClass={(info) => cn('shrink-1', !info.isShort && (info.isNarrow ? 'ui-fc-row-inner-wide' : 'ui-fc-column-title-wide'))}
        moreLinkClass='ui-fc-nav-focus'
        moreLinkInnerClass='whitespace-nowrap overflow-hidden'
        columnMoreLinkClass='ui-fc-column-more'
        columnMoreLinkInnerClass={(info) => info.isNarrow ? 'ui-fc-column-more-inner-narrow' : 'ui-fc-column-more-inner-wide'}
        dayHeaderAlign='center'
        dayHeaderClass={(info) => cn('justify-center', info.isMajor && 'ui-fc-header-major', (info.isDisabled && !info.inPopover) && 'ui-fc-disabled')}
        dayHeaderInnerClass='group ui-fc-day-header-inner'
        dayHeaderContent={(info) => <>
            {info.weekdayText && <div className='ui-fc-weekday-label'>{info.weekdayText}</div>}
            {info.dayNumberText && <div className={cn('ui-fc-day-header-number', info.isNarrow ? 'ui-fc-day-header-narrow' : 'ui-fc-day-header-wide', info.isToday ? ['ui-fc-today', info.hasNavLink && 'ui-fc-today-group-hover'] : (info.hasNavLink && 'ui-fc-group-hover'), info.hasNavLink && 'ui-fc-group-focus')}>{info.dayNumberText}</div>}
        </>}
        dayCellClass={(info) => cn('ui-fc-cell-border', info.isMajor && 'ui-fc-cell-major', info.isDisabled && 'ui-fc-disabled')}
        dayCellTopClass={(info) => cn('flex flex-row', info.isNarrow ? 'ui-fc-cell-top-narrow' : 'ui-fc-cell-top-wide')}
        dayCellTopInnerClass={(info) => cn('ui-fc-cell-top-inner', info.isNarrow ? 'ui-fc-cell-inner-narrow' : 'ui-fc-cell-inner-wide', info.text === info.dayNumberText ? (info.isNarrow ? 'ui-fc-cell-number-narrow' : 'ui-fc-cell-number-wide') : (info.isNarrow ? 'ui-fc-cell-label-narrow' : 'ui-fc-cell-label-wide'), info.isToday ? ['ui-fc-today', info.hasNavLink && 'ui-fc-today-hover'] : (info.hasNavLink && 'ui-fc-hover'), info.isOther && 'text-muted-foreground', info.monthText && 'font-semibold')}
        dayCellInnerClass={(info) => cn(info.inPopover && 'ui-fc-cell-in-popover')}
        popoverFormat={{ day: 'numeric', weekday: 'short' }}
        popoverClass='ui-fc-popover'
        popoverCloseClass='group ui-fc-popover-close'
        dayLaneClass={(info) => cn('ui-fc-cell-border', info.isMajor && 'ui-fc-cell-major', info.isDisabled && 'ui-fc-disabled')}
        dayLaneInnerClass={(info) => info.isStack ? 'ui-fc-lane-stack' : info.isNarrow ? 'ui-fc-lane-narrow' : 'ui-fc-lane-wide'}
        slotLaneClass={(info) => cn('ui-fc-cell-border', info.isMinor && 'ui-fc-cell-minor')}
        listDayFormat={{ day: 'numeric' }}
        listDayAltFormat={{ month: 'short', weekday: 'short', forceCommas: true }}
        listDayClass={(info) => cn(!info.isLast && 'ui-fc-divider-bottom', 'flex flex-row items-start')}
        listDayHeaderClass='ui-fc-list-day-header'
        listDayHeaderInnerClass={(info) => cn(!info.level ? ['ui-fc-list-day-header-primary', info.text === info.dayNumberText ? 'ui-fc-list-day-number' : 'ui-fc-list-day-text', info.isToday ? ['ui-fc-today', info.hasNavLink && 'ui-fc-today-hover'] : (info.hasNavLink && 'ui-fc-hover')] : ['ui-fc-weekday-label', info.hasNavLink && 'ui-fc-underline-hover'])}
        listDayBodyClass='ui-fc-list-day-body'
        singleMonthClass={(info) => cn(info.multiMonthColumns > 1 && 'ui-fc-multi-month', (info.multiMonthColumns === 1 && !info.isLast) && 'ui-fc-divider-bottom')}
        singleMonthHeaderClass={(info) => cn(info.multiMonthColumns > 1 ? 'ui-fc-multi-month-header' : 'ui-fc-single-month-header', 'items-center')}
        singleMonthHeaderInnerClass={(info) => cn('ui-fc-single-month-title', info.hasNavLink && 'ui-fc-hover')}
        tableHeaderClass='bg-background'
        fillerClass={(info) => cn('ui-fc-filler', info.inTableHeader && 'ui-fc-transparent-border')}
        dayNarrowWidth={100}
        dayHeaderRowClass='ui-fc-cell-border'
        dayRowClass='ui-fc-cell-border'
        navLinkClass='ui-fc-nav-focus'
        inlineWeekNumberClass={(info) => cn('ui-fc-inline-week-number', info.isNarrow ? 'ui-fc-inline-week-narrow' : 'ui-fc-inline-week-wide', info.hasNavLink && 'ui-fc-week-number-hover')}
        nonBusinessHoursClass='ui-fc-disabled'
        highlightClass='ui-fc-highlight'
        nowIndicatorLineClass='ui-fc-now-line'
        nowIndicatorDotClass='ui-fc-now-dot'
        views={{
            ...userViews,
            dayGrid: { ...dayRowCommonClasses, dayCellBottomClass: getShortDayCellBottomClass, ...userViews?.dayGrid },
            multiMonth: { ...dayRowCommonClasses, dayCellBottomClass: getShortDayCellBottomClass,
                tableBodyClass: (info) => cn(info.multiMonthColumns > 1 && 'ui-fc-multi-month-body'),
                dayHeaderInnerClass: (info) => cn(!info.inPopover && 'ui-fc-multi-month-header-inner'),
                dayHeaderDividerClass: (info) => cn(info.multiMonthColumns === 1 && 'ui-fc-divider-bottom'), ...userViews?.multiMonth },
            timeGrid: { ...dayRowCommonClasses, dayCellBottomClass: 'ui-fc-day-bottom-tall',
                weekNumberHeaderClass: 'items-center justify-end',
                weekNumberHeaderInnerClass: (info) => cn('ui-fc-time-week-number', info.options.dayMinWidth !== undefined && 'ui-fc-time-week-end', info.isNarrow ? 'ui-fc-time-week-narrow' : 'ui-fc-time-week-wide', info.hasNavLink && 'ui-fc-week-number-hover'),
                allDayHeaderClass: 'items-center justify-end',
                allDayHeaderInnerClass: (info) => cn('ui-fc-all-day-header', info.isNarrow ? 'ui-fc-text-compact' : 'text-body-md'),
                allDayDividerClass: 'ui-fc-divider-bottom',
                slotHeaderClass: (info) => cn('ui-fc-slot-header', info.isMinor && 'ui-fc-cell-minor'),
                slotHeaderInnerClass: (info) => cn('ui-fc-slot-header-inner', info.isNarrow ? 'ui-fc-slot-header-narrow' : 'ui-fc-slot-header-wide', info.isFirst && 'hidden'),
                slotHeaderDividerClass: (info) => cn('ui-fc-slot-divider', (info.inTableHeader && info.options.dayMinWidth === undefined) && 'ui-fc-transparent-border'), ...userViews?.timeGrid },
        }} {...restOptions} />;
}
// Required geometric continuation marker, not a decorative icon.
function filledRightTriangle(className?: string) {
    return <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 2200' preserveAspectRatio='none' aria-hidden='true' focusable='false' className={className}><polygon points='0,0 66,0 800,1100 66,2200 0,2200' fill='currentColor' /></svg>;
}
