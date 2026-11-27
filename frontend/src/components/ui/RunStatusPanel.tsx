import { useEffect, useState, type ReactNode } from "react";
import { RotateCcw, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { KeyValueList } from "./KeyValueList";
import { RunStatusBadge } from "./RunStatusBadge";
import { ErrorState } from "./error-state";
import { Progress } from "./progress";
import { formatRunDurationMs, formatRunTimestamp, isActiveCanonicalStatus, runDurationMs } from "./runStatusModel";

export type RunStatusPanelProps = { status: string | null | undefined; title?: string; runId?: string | null; progress?: number | null; stage?: string | null; startedAt?: string | null; completedAt?: string | null; createdAt?: string | null; latencyMs?: number | null; errorMessage?: string | null; onRetry?: () => void; onReplay?: () => void; retryLabel?: string; replayLabel?: string; retryDisabled?: boolean; replayDisabled?: boolean; replayReason?: string | null; actions?: ReactNode; dense?: boolean };

function useRunClock(active: boolean) {
    const [nowMs, setNowMs] = useState<number>();
    useEffect(() => {
        if (!active) return;
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [active]);
    return active ? nowMs : undefined;
}

type RunActionsProps = Pick<RunStatusPanelProps, "onRetry" | "onReplay" | "retryLabel" | "replayLabel" | "retryDisabled" | "replayDisabled" | "replayReason" | "actions"> & { active: boolean };
function RunActions({ active, actions, onRetry, onReplay, retryLabel = "Retry", replayLabel = "Replay", retryDisabled, replayDisabled, replayReason }: RunActionsProps) {
    return <div className="ui-run-actions">
        {actions}
        {onRetry && <Button variant="outline" disabled={Boolean(retryDisabled) || active} onClick={onRetry} type="button"><RefreshCw />{retryLabel}</Button>}
        {onReplay && <Button variant="outline" disabled={Boolean(replayDisabled) || active} onClick={onReplay} title={replayReason ?? undefined} type="button"><RotateCcw />{replayLabel}</Button>}
    </div>;
}

function RunProgress({ progress }: Pick<RunStatusPanelProps, "progress">) {
    const value = typeof progress === "number" && Number.isFinite(progress) ? progress : undefined;
    const label = value === undefined ? "Run in progress" : `Run progress ${Math.round(value)} percent`;
    return <div>
        <Progress value={value === undefined ? undefined : Math.max(0, Math.min(100, value))} aria-label={label} className={value === undefined ? "ui-run-indeterminate" : undefined} />
        {value !== undefined && <span className="ui-muted-caption">{Math.round(value)}%</span>}
    </div>;
}

function RunDetails({ props, active, nowMs }: { props: RunStatusPanelProps; active: boolean; nowMs?: number }) {
    const { startedAt, completedAt, createdAt, latencyMs, stage } = props;
    const duration = runDurationMs({ startedAt, completedAt, createdAt, latencyMs, nowMs });
    return <KeyValueList dense items={[
        { key: "stage", label: "Current stage", value: stage?.trim() || (active ? "In progress" : "—") },
        { key: "started", label: "Started", value: formatRunTimestamp(startedAt ?? createdAt) },
        { key: "duration", label: "Duration", value: formatRunDurationMs(duration) },
        { key: "completed", label: "Completed", value: formatRunTimestamp(completedAt) },
    ]} />;
}

function RunFeedback({ errorMessage, replayReason, onReplay, replayDisabled }: RunStatusPanelProps) {
    return <>
        {errorMessage ? <ErrorState description={errorMessage} /> : null}
        {replayReason && onReplay && replayDisabled ? <p className="ui-muted-caption">{replayReason}</p> : null}
    </>;
}

export function RunStatusPanel(props: RunStatusPanelProps) {
    const { status, title = "Run status", runId, progress, dense = false } = props;
    const active = isActiveCanonicalStatus(status);
    const nowMs = useRunClock(active);
    return <div className="ui-run-panel" data-dense={dense} role="status" aria-live={active ? "polite" : "off"} aria-atomic="false">
        <div className="ui-run-header">
            <div className="ui-run-title-row"><h3 className="ui-run-title">{title}</h3><RunStatusBadge status={status} />{runId ? <span className="ui-muted-caption">{runId}</span> : null}</div>
            <RunActions {...props} active={active} />
        </div>
        {active && <RunProgress progress={progress} />}
        <RunDetails props={props} active={active} nowMs={nowMs} />
        <RunFeedback {...props} />
    </div>;
}
