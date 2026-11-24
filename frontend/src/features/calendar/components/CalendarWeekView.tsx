import dayjs from "dayjs";
import { formatTimeValue, getMinutesFromTimeString, getWeekItemColor } from "../calendarDisplay";
import type { DashboardCalendarModel } from "../hooks/useDashboardCalendar";

export function CalendarWeekView({ m }: { m: DashboardCalendarModel }) {
const { anchorDate, itemsByDate, openDay } = m;
    const weekDays = Array.from({ length: 7 }, (_: any, index: any) =>
        anchorDate.startOf("week").add(index, "day")
    );
    const hourSlots = Array.from({ length: 10 }, (_: any, index: any) => 9 + index);
    const rowHeight = 88;
    const dayColumnWidth = 194;

    const timedWeekItems = weekDays.map((day) => {
        const dateKey = day.format("YYYY-MM-DD");
        return (itemsByDate[dateKey] ?? [])
            .filter((item) => item.start_time)
            .map((item) => {
                const startMinutes = getMinutesFromTimeString(item.start_time ?? "09:00");
                const endMinutes = item.end_time
                    ? getMinutesFromTimeString(item.end_time)
                    : startMinutes + 60;
                const clampedStart = Math.max(9 * 60, startMinutes);
                const clampedEnd = Math.max(clampedStart + 30, endMinutes);

                return {
                    ...item,
                    top: ((clampedStart - 9 * 60) / 60) * rowHeight,
                    height: Math.max(((clampedEnd - clampedStart) / 60) * rowHeight, 44),
                };
            });
    });

    const allDayWeekItems = weekDays.map((day) => {
        const dateKey = day.format("YYYY-MM-DD");
        return (itemsByDate[dateKey] ?? []).filter((item) => !item.start_time);
    });

    return (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div
                style={({
                    borderRadius: 16,
                    border: `1px solid ${"var(--border)"}`,
                    overflow: "hidden",
                    backgroundColor: "var(--card)",
                    minWidth: 980
                })}
            >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: `88px repeat(7, minmax(${dayColumnWidth}px, 1fr))`,
                }}
            >
                <div
                    style={({
                        borderRight: `1px solid ${"var(--border)"}`,
                        borderBottom: `1px solid ${"var(--border)"}`,
                        backgroundColor: "var(--background)"
                    })}
                />
                {weekDays.map((day) => {
                    const isToday = day.isSame(dayjs(), "day");
                    return (
                        <div
                            key={day.format("YYYY-MM-DD")}
                            style={({
                                minHeight: 88,
                                paddingInline: 16,
                                paddingBlock: 12,
                                borderRight: `1px solid ${"var(--border)"}`,
                                borderBottom: `1px solid ${"var(--border)"}`,
                                backgroundColor: "var(--background)",
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "center"
                            })}
                        >
                            <div className="flex flex-row gap-[8px] items-center">
                                <p style={{ fontWeight: 600 }}>
                                    {day.format("ddd D")}
                                </p>
                                {isToday && (
                                    <div
                                        style={({
                                            width: 32,
                                            height: 32,
                                            borderRadius: "999px",
                                            display: "grid",
                                            placeItems: "center",
                                            backgroundColor: "var(--primary)",
                                            color: "var(--primary-foreground)",
                                            fontSize: 14,
                                            fontWeight: 700
                                        })}
                                    >
                                        {day.format("D")}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                <div
                    style={({
                        minHeight: 64,
                        paddingInline: 12,
                        paddingBlock: 8,
                        borderRight: `1px solid ${"var(--border)"}`,
                        borderBottom: `1px solid ${"var(--border)"}`,
                        backgroundColor: "var(--background)"
                    })}
                >
                    <span style={{ fontWeight: 700 }} className="text-muted-foreground">
                        All day
                    </span>
                </div>
                {weekDays.map((day, dayIndex) => {
                    const allDayItems = allDayWeekItems[dayIndex];
                    return (
                        <div
                            key={`${day.format("YYYY-MM-DD")}-all-day`}
                            style={({
                                minHeight: 64,
                                padding: 8,
                                borderRight: `1px solid ${"var(--border)"}`,
                                borderBottom: `1px solid ${"var(--border)"}`,
                                backgroundColor: "var(--card)"
                            })}
                        >
                            <div className="flex gap-[6px]">
                                {allDayItems.slice(0, 2).map((item) => {
                                    const colors = getWeekItemColor(item);
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => openDay(day)}
                                            aria-label={`Open ${item.title} on ${day.format("dddd, MMMM D")}`}
                                            style={{
                                                width: "100%",
                                                textAlign: "left",
                                                paddingInline: 10,
                                                paddingBlock: 6,
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
                                {allDayItems.length > 2 && (
                                    <span className="text-muted-foreground">
                                        +{allDayItems.length - 2} more
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                <div
                    style={({
                        position: "relative",
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
                                paddingTop: 6.4,
                                borderBottom: `1px solid ${"var(--border)"}`
                            })}
                        >
                            <p style={{ fontWeight: 600 }} className="text-muted-foreground">
                                {dayjs().hour(hour).minute(0).format("h A")}
                            </p>
                        </div>
                    ))}
                </div>
                {weekDays.map((day, dayIndex) => (
                    <div
                        key={`${day.format("YYYY-MM-DD")}-grid`}
                        style={({
                            position: "relative",
                            height: rowHeight * hourSlots.length,
                            borderRight: `1px solid ${"var(--border)"}`,
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
                        {timedWeekItems[dayIndex].map((item) => {
                            const colors = getWeekItemColor(item);
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => openDay(day)}
                                    aria-label={`Open ${item.title} on ${day.format("dddd, MMMM D")} at ${formatTimeValue(item.start_time ?? "09:00")}`}
                                    style={{
                                        position: "absolute",
                                        top: item.top,
                                        left: 8,
                                        right: 8,
                                        height: item.height,
                                        paddingInline: 10,
                                        paddingBlock: 8,
                                        borderRadius: 8,
                                        border: `1px solid ${colors.border}`,
                                        backgroundColor: colors.bg,
                                        color: colors.text,
                                        cursor: "pointer",
                                        overflow: "hidden",
                                        textAlign: "left",
                                    }}>
                                    <p style={{ fontWeight: 700, lineHeight: 1.3 }}>
                                        {item.title}
                                    </p>
                                    <p style={{ marginTop: 3.2 }}>
                                        {formatTimeValue(item.start_time ?? "09:00")}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            </div>
        </div>
    );
}
