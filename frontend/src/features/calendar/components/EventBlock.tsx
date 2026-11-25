import type { CSSProperties } from "react";
import type { Dayjs } from "dayjs";
import type { CalendarItem } from "../../../api/calendar";
import { formatItemTime, getWeekItemColor } from "../calendarDisplay";

type EventBlockProps = {
    item: CalendarItem;
    day: Dayjs;
    onOpen: () => void;
    showTime?: boolean;
    timeLabel?: string;
    style?: CSSProperties;
};

export function EventBlock({
    item,
    day,
    onOpen,
    showTime = false,
    timeLabel,
    style,
}: EventBlockProps) {
    const colors = getWeekItemColor(item);
    const accessibleLabel = `Open ${item.title} on ${day.format("dddd, MMMM D")}`;
    const label = showTime ? `${accessibleLabel} at ${timeLabel ?? formatItemTime(item)}` : accessibleLabel;

    return (
        <button
            type="button"
            onClick={onOpen}
            aria-label={label}
            className="block overflow-hidden text-left"
            style={{
                paddingInline: 10,
                paddingBlock: showTime ? 8 : 6,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg,
                color: colors.text,
                ...style,
            }}
        >
            <span className="block font-semibold">{item.title}</span>
            {showTime ? <span className="mt-1 block">{timeLabel ?? formatItemTime(item)}</span> : null}
        </button>
    );
}
