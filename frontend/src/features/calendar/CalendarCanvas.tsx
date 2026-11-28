import { useTranslation } from "react-i18next";
import { EventCalendar } from "../../components/ui/event-calendar";
import frLocale from "@fullcalendar/react/locales/fr";
import nlLocale from "@fullcalendar/react/locales/nl";
import { languageDirection } from "@/i18n/config";
import type { CalendarViewMode } from "./calendarDisplay";
import type { DashboardCalendarModel } from "./useDashboardCalendar";

const viewNames: Record<CalendarViewMode, string> = {
    day: "timeGridDay",
    week: "timeGridWeek",
    month: "dayGridMonth",
    twelve_month: "multiMonthRollingYear",
};

export function CalendarCanvas({ model }: { model: DashboardCalendarModel }) {
    const { i18n } = useTranslation();
    const availableViews = model.allowedViews.map((view) => viewNames[view]);

    return (
        <EventCalendar
            availableViews={availableViews}
            initialView={viewNames[model.initialView]}
            views={{
                multiMonthRollingYear: {
                    type: "multiMonth",
                    duration: { months: 12 },
                },
            }}
            buttons={{ multiMonthRollingYear: { text: "12M" } }}
            locales={[frLocale, nlLocale]}
            events={model.events}
            eventsRevision={model.eventsRevision}
            eventClick={({ event }) => model.openDay(event.startStr)}
            dateClick={({ dateStr }) => model.openDay(dateStr)}
            locale={i18n.resolvedLanguage ?? "en"}
            direction={languageDirection(i18n.resolvedLanguage ?? "en")}
            height="auto"
            multiMonthMaxColumns={3}
            editable={false}
            eventStartEditable={false}
            eventDurationEditable={false}
            selectable={false}
        />
    );
}
