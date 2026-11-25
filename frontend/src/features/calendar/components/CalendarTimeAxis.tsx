import dayjs from "dayjs";

type CalendarTimeAxisProps = {
    hours: number[];
    rowHeight: number;
    paddingTop: number;
};

export function CalendarTimeAxis({ hours, rowHeight, paddingTop }: CalendarTimeAxisProps) {
    return (
        <div className="border-r border-border bg-background">
            {hours.map((hour) => (
                <div
                    key={hour}
                    className="border-b border-border px-2.5"
                    style={{ height: rowHeight, paddingTop }}
                >
                    <p className="font-semibold text-muted-foreground">
                        {dayjs().hour(hour).minute(0).format("h A")}
                    </p>
                </div>
            ))}
        </div>
    );
}
