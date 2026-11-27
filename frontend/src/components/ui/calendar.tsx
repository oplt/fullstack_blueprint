import * as React from "react";
import { cn } from "@/lib/utils";
import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from "react-day-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
function Calendar({ className, classNames, showOutsideDays = true, captionLayout = "label", buttonVariant = "ghost", locale, formatters, components, ...props }: React.ComponentProps<typeof DayPicker> & { buttonVariant?: React.ComponentProps<typeof Button>["variant"] }) {
    const defaults = getDefaultClassNames();
    return <DayPicker showOutsideDays={showOutsideDays} className={cn("group/calendar ui-calendar", className)} captionLayout={captionLayout} locale={locale} formatters={{ formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }), ...formatters }}
        classNames={{
            root: cn("ui-calendar-root", defaults.root),
            months: cn("ui-calendar-months", defaults.months),
            month: cn("ui-calendar-month", defaults.month),
            nav: cn("ui-calendar-nav", defaults.nav),
            button_previous: cn(buttonVariants({ variant: buttonVariant }), "ui-calendar-nav-button", defaults.button_previous),
            button_next: cn(buttonVariants({ variant: buttonVariant }), "ui-calendar-nav-button", defaults.button_next),
            month_caption: cn("ui-calendar-caption", defaults.month_caption),
            dropdowns: cn("ui-calendar-dropdowns", defaults.dropdowns),
            dropdown_root: cn("ui-calendar-dropdown-root", defaults.dropdown_root),
            dropdown: cn("ui-calendar-dropdown", defaults.dropdown),
            caption_label: cn("ui-calendar-caption-label", captionLayout !== "label" && "ui-calendar-caption-select", defaults.caption_label),
            month_grid: cn("ui-calendar-grid", defaults.month_grid),
            weekdays: cn("ui-calendar-weekdays", defaults.weekdays),
            weekday: cn("ui-calendar-weekday", defaults.weekday),
            week: cn("ui-calendar-week", defaults.week),
            week_number_header: cn("ui-calendar-week-number-header", defaults.week_number_header),
            week_number: cn("ui-calendar-week-number", defaults.week_number),
            day: cn("group/day ui-calendar-day", props.showWeekNumber ? "ui-calendar-day-with-week-number" : "ui-calendar-day-without-week-number", defaults.day),
            range_start: cn("ui-calendar-range-start", defaults.range_start),
            range_middle: cn("ui-calendar-range-middle", defaults.range_middle),
            range_end: cn("ui-calendar-range-end", defaults.range_end),
            today: cn("ui-calendar-today", defaults.today),
            outside: cn("ui-calendar-outside", defaults.outside),
            disabled: cn("ui-calendar-disabled", defaults.disabled),
            hidden: cn("ui-calendar-hidden", defaults.hidden),
            ...classNames,
        }}
        components={{
            Root: ({ className, rootRef, ...props }) => <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />,
            Chevron: ({ className, orientation, ...props }) => {
                const Icon = orientation === "left" ? ChevronLeftIcon : orientation === "right" ? ChevronRightIcon : ChevronDownIcon;
                return <Icon className={cn("ui-calendar-chevron", className)} {...props} />;
            },
            DayButton: (props) => <CalendarDayButton locale={locale} {...props} />,
            WeekNumber: ({ children, ...props }) => <td {...props}><div className="ui-calendar-week-number-cell">{children}</div></td>,
            ...components,
        }} {...props} />;
}
function CalendarDayButton({ className, day, modifiers, locale, ...props }: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
    const defaults = getDefaultClassNames();
    const ref = React.useRef<HTMLButtonElement>(null);
    React.useEffect(() => { if (modifiers.focused) ref.current?.focus(); }, [modifiers.focused]);
    return <Button ref={ref} variant="ghost" data-day={day.date.toLocaleDateString(locale?.code)}
        data-selected-single={modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle}
        data-range-start={modifiers.range_start} data-range-end={modifiers.range_end} data-range-middle={modifiers.range_middle}
        className={cn("ui-calendar-day-button", defaults.day, className)} {...props} type="button" />;
}
export { Calendar, CalendarDayButton };
