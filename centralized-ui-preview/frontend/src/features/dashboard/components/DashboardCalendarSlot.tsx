import { lazy, Suspense } from "react";
import type { Project } from "../../../api/projects";

const DashboardCalendar = lazy(() =>
    import("../../../components/dashboard/DashboardCalendar").then((module) => ({ default: module.DashboardCalendar }))
);

type Props = {
    enabled: boolean;
    projects: Project[];
    projectsLoading: boolean;
    projectsEnabled: boolean;
    onOpenProjects?: () => void;
};

export function DashboardCalendarSlot(props: Props) {
    if (!props.enabled) return null;
    return (
        <Suspense fallback={<div role="status" aria-label="Loading calendar" className="ui-auto-dashboard-calendar-slot-div" />}>
            <DashboardCalendar
                projects={props.projects}
                projectsLoading={props.projectsLoading}
                projectsEnabled={props.projectsEnabled}
                onOpenProjects={props.onOpenProjects}
                allowedViews={["month"]}
                initialView="month"
            />
        </Suspense>
    );
}
