import { Button } from "@/components/ui/button";
import { colorMix } from "@/lib/color";
import dayjs from "dayjs";
import { formatDateOnly, humanizeKey } from "../../../utils/formatters";
import { formatItemTime, getMinutesFromTimeString, getWeekItemColor } from "../calendarDisplay";
import { DayItems } from "./DayItems";
import type { DashboardCalendarModel } from "../hooks/useDashboardCalendar";
import { MonthDateCalendar } from "./MonthDateCalendar";

export function CalendarDayView({ m }: { m: DashboardCalendarModel }) {
const { anchorDate, itemsByDate, openDay } = m;
    const dayKey = anchorDate.format("YYYY-MM-DD");
    const dayItems = itemsByDate[dayKey] ?? [];
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
            };
        });
    const allDayItems = dayItems.filter((item) => !item.start_time);
    const hourSlots = Array.from({ length: 24 }, (_: any, index: any) => index);
    const rowHeight = 56;
    const gridStartMinutes = 0;
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
                    className="flex flex-col sm:flex-row gap-[12px] justify-between"
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
                        <div className="flex flex-row gap-[8px] flex-wrap" style={{ marginTop: 8 }}>
                            {allDayItems.map((item) => {
                                const colors = getWeekItemColor(item);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => openDay(anchorDate)}
                                        aria-label={`Open ${item.title} on ${anchorDate.format("dddd, MMMM D")}`}
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            paddingInline: 10,
                                            paddingBlock: 6.4,
                                            borderRadius: 8,
                                            border: `1px solid ${colors.border}`,
                                            backgroundColor: colors.bg,
                                            color: colors.text,
                                            cursor: "pointer",
                                        }}>
                                        <p style={{ fontWeight: 600 }}>
                                            {item.title}
                                        </p>
                                    </div>
                                );
                            })}
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
                    <div
                        style={({
                            borderRight: `1px solid ${"var(--border)"}`,
                            backgroundColor: "var(--background)"
                        })}
                    >
                        {hourSlots.map((hour) => (
                            <div
                                key={hour}
                                style={({
                                    height: rowHeight,
                                    paddingInline: 10,
                                    paddingTop: 4.4,
                                    borderBottom: `1px solid ${"var(--border)"}`
                                })}
                            >
                                <p style={{ fontWeight: 600 }} className="text-muted-foreground">
                                    {dayjs().hour(hour).minute(0).format("h A")}
                                </p>
                            </div>
                        ))}
                    </div>
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
                            const colors = getWeekItemColor(item);
                            const top = ((item.startMinutes - gridStartMinutes) / 60) * rowHeight;
                            const height = Math.max(
                                ((item.endMinutes - item.startMinutes) / 60) * rowHeight,
                                44
                            );

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => openDay(anchorDate)}
                                    aria-label={`Open ${item.title} on ${anchorDate.format("dddd, MMMM D")} at ${formatItemTime(item)}`}
                                    style={{
                                        position: "absolute",
                                        top,
                                        left: 12,
                                        right: 12,
                                        height,
                                        paddingInline: 10,
                                        paddingBlock: 8,
                                        borderRadius: 8,
                                        border: `1px solid ${colors.border}`,
                                        backgroundColor: colors.bg,
                                        color: colors.text,
                                        cursor: "pointer",
                                        overflow: "hidden",
                                        textAlign: "left",
                                        zIndex: 1,
                                    }}>
                                    <p style={{ fontWeight: 700, lineHeight: 1.3 }}>
                                        {item.title}
                                    </p>
                                    <p style={{ marginTop: 3.2 }}>
                                        {formatItemTime(item)}
                                    </p>
                                </div>
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
                <div style={{ padding: 16 }}>
                    {selectedDetailItem ? (
                        <div className="flex gap-[16px]">
                            <div>
                                <h6>{selectedDetailItem.title}</h6>
                                <p style={{ marginTop: 4 }} className="text-muted-foreground">
                                    {selectedDetailItem.description || "No extra notes for this item."}
                                </p>
                            </div>
                            <div className="flex gap-[8px]">
                                <p className="text-muted-foreground">
                                    {formatDateOnly(dayKey)}
                                </p>
                                <p className="text-muted-foreground">
                                    {formatItemTime(selectedDetailItem)}
                                </p>
                                {selectedDetailItem.project_name && (
                                    <p className="text-muted-foreground">
                                        Project: {selectedDetailItem.project_name}
                                    </p>
                                )}
                                {selectedDetailItem.priority && (
                                    <p className="text-muted-foreground">
                                        Priority: {humanizeKey(selectedDetailItem.priority)}
                                    </p>
                                )}
                            </div>
                            <Button variant="outline" onClick={() => openDay(anchorDate)} type="button">
                                Edit or add item
                            </Button>
                        </div>
                    ) : (
                        <DayItems
                            items={dayItems}
                            emptyTitle="Nothing scheduled for this day"
                            emptyDescription="Use Add item to create an event, appointment, or task."
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
