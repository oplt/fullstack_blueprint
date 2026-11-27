import { SectionCard } from "@/components/ui/SectionCard";
import { QueryErrorAlert } from "@/components/ui/QueryBoundary";
import { CalendarCanvas } from "@/features/calendar/components/CalendarCanvas";
import { CalendarItemDrawer } from "@/features/calendar/components/CalendarItemDrawer";
import type { DashboardCalendarProps } from "@/features/calendar/calendarDisplay";
import { useDashboardCalendar } from "@/features/calendar/hooks/useDashboardCalendar";

export function DashboardCalendar(props: DashboardCalendarProps) {
    const model = useDashboardCalendar(props);

    return (
        <div className="flex h-full min-h-0 flex-col gap-ui-md">
            <SectionCard
                title="Workspace calendar"
                description="Switch between day, week, month, and rolling 12-month views."
                className={props.className}
                contentClassName={props.contentClassName}
            >
                {model.calendarError ? (
                    <QueryErrorAlert
                        error={model.calendarError}
                        fallback="Failed to load calendar items."
                        onRetry={model.retryCalendar}
                    />
                ) : null}
                <CalendarCanvas model={model} />
            </SectionCard>
            <CalendarItemDrawer m={model} />
        </div>
    );
}
