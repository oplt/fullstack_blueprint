type WebVitalName = "FCP" | "LCP" | "CLS" | "INP";
type WebVitalMetric = { name: WebVitalName; value: number; rating: "good" | "needs-improvement" | "poor"; navigationId?: string };

export type WebVitalsOptions = {
    onMetric?: (metric: WebVitalMetric) => void;
    sampleRate?: number;
};

function rating(name: WebVitalName, value: number): WebVitalMetric["rating"] {
    if (name === "CLS") return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
    if (name === "INP") return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
    if (name === "LCP") return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
    return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
}

function emit(name: WebVitalName, value: number, options: WebVitalsOptions) {
    if (Math.random() > (options.sampleRate ?? 1)) return;
    const metric: WebVitalMetric = { name, value, rating: rating(name, value), navigationId: typeof performance !== "undefined" ? performance.timeOrigin.toString() : undefined };
    options.onMetric?.(metric);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("blueprint:web-vital", { detail: metric }));
}

/** Observe browser vitals without adding a telemetry vendor or sending sensitive data. */
export function startWebVitals(options: WebVitalsOptions = {}): () => void {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return () => undefined;
    const observers: PerformanceObserver[] = [];
    const observe = (type: string, callback: (entries: PerformanceObserverEntryList) => void, options?: PerformanceObserverInit) => {
        try { const observer = new PerformanceObserver((list) => callback(list)); observer.observe({ type, buffered: true, ...options }); observers.push(observer); } catch { /* unsupported entry type */ }
    };
    observe("paint", (list) => { const first = list.getEntriesByName("first-contentful-paint")[0]; if (first) emit("FCP", first.startTime, options); });
    observe("largest-contentful-paint", (list) => { const entries = list.getEntries(); const last = entries[entries.length - 1]; if (last) emit("LCP", last.startTime, options); });
    let cls = 0;
    observe("layout-shift", (list) => { for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) if (!entry.hadRecentInput) cls += entry.value ?? 0; emit("CLS", cls, options); });
    observe("event", (list) => { const entries = list.getEntries() as Array<PerformanceEntry & { duration?: number }>; const last = entries[entries.length - 1]; if (last?.duration) emit("INP", last.duration, options); }, { durationThreshold: 40 } as PerformanceObserverInit);
    return () => observers.forEach((observer) => observer.disconnect());
}
