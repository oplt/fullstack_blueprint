import { ChevronRight, FolderKanban, LogOut, X, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useApplicationConfiguration } from "@/config/application/useConfiguration";
import { ROUTES } from "@/config/routes";
import type { Project } from "../../api/projects";
import { getInitials } from "../../utils/formatters";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";

type Page = { label: string; path: string; icon: LucideIcon };
type SidebarProps = {
    collapsed: boolean;
    projectsEnabled: boolean;
    name: string;
    pages: Page[];
    settings: Page[];
    active?: string;
    projects: Project[];
    project?: Project;
    close?: () => void;
    select: (project: Project) => void;
    signOut: () => void;
};

function ProjectSelector({ projects, project, select }: Pick<SidebarProps, "projects" | "project" | "select">) {
    const { t } = useTranslation();
    return <Popover>
        <PopoverTrigger className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">
            <FolderKanban aria-hidden size={14} />
            <span className="min-w-0 flex-1 truncate">{project?.name ?? t("status.selectProject")}</span>
            <ChevronRight aria-hidden size={13} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-1">
            {projects.slice(0, 8).map(item => <button type="button" key={item.id} onClick={() => select(item)}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted">
                {item.name}
            </button>)}
            {!projects.length && <p className="p-3 text-sm text-muted-foreground">{t("status.noProjects")}</p>}
            <Link to={ROUTES.projects} className="block rounded-md px-3 py-2 text-sm text-primary hover:bg-muted">
                {t("status.viewAllProjects")}
            </Link>
        </PopoverContent>
    </Popover>;
}

function SidebarAccount({ collapsed, signOut }: Pick<SidebarProps, "collapsed" | "signOut">) {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const { data: profile } = useUserProfile();
    return <div className="border-t p-3">
        <Link to={ROUTES.profile} aria-label={t("navigation.openProfile")} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
            <Avatar>
                <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                <AvatarFallback>{currentUser && getInitials(currentUser.full_name, currentUser.email)}</AvatarFallback>
            </Avatar>
            {!collapsed && <span className="truncate text-sm">{currentUser?.full_name ?? currentUser?.email ?? t("status.profile")}</span>}
        </Link>
        <button type="button" onClick={signOut} aria-label={t("actions.signOut")}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <LogOut aria-hidden size={18} />{!collapsed && t("actions.signOut")}
        </button>
    </div>;
}

export function WorkspaceSidebar(props: SidebarProps) {
    const { t } = useTranslation();
    const { branding } = useApplicationConfiguration();
    const { collapsed, name, close } = props;
    function pageLink(page: Page) {
        const active = page.path === props.active;
        const Icon = page.icon;
        return <Link key={page.path} to={page.path} onClick={close} aria-label={page.label}
            title={collapsed ? page.label : undefined} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <Icon aria-hidden size={18} />{!collapsed && page.label}
        </Link>;
    }
    return <>
        <div className="px-4">
            <div className="flex h-16 items-center justify-between">
                <Link to={ROUTES.dashboard} aria-label={name} className="flex min-w-0 items-center gap-2 truncate font-semibold tracking-tight">
                    {branding.logo && <img src={branding.logo} alt={branding.logoAlt ?? name} className="h-7 w-7 shrink-0 rounded object-contain" />}
                    {collapsed ? name.slice(0, 1) : name}
                </Link>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("navigation.closeNavigation")} onClick={close} type="button"><X size={18} aria-hidden="true" /></Button>
            </div>
            {props.projectsEnabled && !collapsed && <ProjectSelector projects={props.projects} project={props.project} select={props.select} />}
        </div>
        <nav aria-label={t("navigation.main")} className="flex-1 space-y-1 px-2">
            {props.pages.map(pageLink)}
            {!!props.settings.length && <div className="mt-5 border-t pt-3">
                <p className={collapsed ? "sr-only" : "px-3 pb-2 text-xs font-semibold uppercase text-muted-foreground"}>{t("navigation.settings")}</p>
                {props.settings.map(pageLink)}
            </div>}
        </nav>
        <SidebarAccount collapsed={collapsed} signOut={props.signOut} />
    </>;
}
