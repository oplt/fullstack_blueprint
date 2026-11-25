import { Button } from "@/components/ui/button";
import { colorMix } from "@/lib/color";
import dayjs from "dayjs";
import { formatDateOnly } from "../../../utils/formatters";
import { getCalendarEventLayout, getMinutesFromTimeString } from "../calendarDisplay";
import { EventBlock } from "./EventBlock";
import { CalendarTimeAxis } from "./CalendarTimeAxis";
import { CalendarDaySummary } from "./CalendarDaySummary";
import type { DashboardCalendarModel } from "../hooks/useDashboardCalendar";
import { MonthDateCalendar } from "./MonthDateCalendar";

export function CalendarDayView({ m }: { m: DashboardCalendarModel }) {
    const { anchorDate, itemsByDate, openDay } = m;
    const dayKey = anchorDate.format("YYYY-MM-DD");
    const dayItems = itemsByDate[dayKey] ?? [];
    const rowHeight = 56;
    const timedItems = dayItems
        .filter((item) => item.start_time)
        .map((item) => {
            const startMinutes = getMinutesFromTimeString(item.start_time ?? "09:00");
            const endMinutes = item.end_time
                ? getMinutesFromTimeString(item.end_time)
                : startMinutes + 60;
            const clampedEnd = Math.max(endMinutes, startMinutes + 30);

            return {
                ...item,
                startMinutes,
                endMinutes: clampedEnd,
                ...getCalendarEventLayout(startMinutes, clampedEnd, 0, rowHeight, 44),
            };
        });
    const allDayItems = dayItems.filter((item) => !item.start_time);
    const hourSlots = Array.from({ length: 24 }, (_, index) => index);
    const now = dayjs();
    const isToday = anchorDate.isSame(now, "day");
    const nowMinutes = now.hour() * 60 + now.minute();
    const nowTop = (nowMinutes / 60) * rowHeight;
    const selectedDetailItem = timedItems[0] ?? allDayItems[0] ?? dayItems[0] ?? null;

    return (
        <div
            style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "1fr",
            }}
        >
            <div
                style={({
                    borderRadius: 16,
                    border: `1px solid ${"var(--border)"}`,
                    overflow: "hidden",
                    backgroundColor: "var(--card)"
                })}
            >
                <div
                    className="flex flex-col sm:flex-row gap-3 justify-between"
                    style={({
                        paddingInline: 16,
                        paddingBlock: 12,
                        borderBottom: `1px solid ${"var(--border)"}`,
                        backgroundColor: "var(--background)"
                    })}>
                    <div>
                        <h6>{formatDateOnly(dayKey)}</h6>
                        <p className="text-muted-foreground">
                            Focused view for one day of scheduled work.
                        </p>
                    </div>
                    <Button variant="default" onClick={() => openDay(anchorDate)} type="button">
                        Add item
                    </Button>
                </div>

                {allDayItems.length > 0 && (
                    <div
                        style={({
                            paddingInline: 16,
                            paddingBlock: 10,
                            borderBottom: `1px solid ${"var(--border)"}`,
                            backgroundColor: "var(--card)"
                        })}
                    >
                        <span style={{ fontWeight: 700 }} className="text-muted-foreground">
                            All day
                        </span>
                        <div className="mt-2 flex flex-row gap-2 flex-wrap">
                            {allDayItems.map((item) => (
                                <EventBlock
                                    key={item.id}
                                    item={item}
                                    day={anchorDate}
                                    onOpen={() => openDay(anchorDate)}
                                    style={{ width: "100%" }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "88px minmax(0, 1fr)",
                        minHeight: rowHeight * hourSlots.length,
                        maxHeight: 760,
                        overflow: "auto",
                    }}
                >
                    <CalendarTimeAxis hours={hourSlots} rowHeight={rowHeight} paddingTop={4.4} />
                    <div
                        style={({
                            position: "relative",
                            backgroundColor: "var(--card)"
                        })}
                    >
                        {hourSlots.map((hour) => (
                            <div
                                key={hour}
                                style={({
                                    height: rowHeight,
                                    borderBottom: `1px solid ${"var(--border)"}`
                                })}
                            />
                        ))}

                        {isToday && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    top: nowTop,
                                    height: 2,
                                    backgroundColor: "var(--primary)",
                                    zIndex: 2,
                                }}
                            />
                        )}

                        {timedItems.map((item) => {
                            return (
                                <EventBlock
                                    key={item.id}
                                    item={item}
                                    day={anchorDate}
                                    onOpen={() => openDay(anchorDate)}
                                    showTime
                                    style={{
                                        position: "absolute",
                                        top: item.top,
                                        left: 12,
                                        right: 12,
                                        height: item.height,
                                        zIndex: 1,
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            <div
                style={({
                    borderRadius: 16,
                    border: `1px solid ${"var(--border)"}`,
                    overflow: "hidden",
                    backgroundColor: "var(--card)"
                })}
            >
                <div
                    style={({
                        padding: 10,
                        borderBottom: `1px solid ${"var(--border)"}`,

                        backgroundColor: colorMix("var(--card)", 0.84)
                    })}
                >
                    <MonthDateCalendar m={m} date={anchorDate} />
                </div>
                <CalendarDaySummary
                    item={selectedDetailItem}
                    items={dayItems}
                    dayKey={dayKey}
                    onEdit={() => openDay(anchorDate)}
                />
            </div>
        </div>
    );
}
