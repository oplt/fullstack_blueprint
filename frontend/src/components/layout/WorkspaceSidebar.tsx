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
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

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
    return <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="mt-1 h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs text-muted-foreground" />}>
            <FolderKanban aria-hidden size={14} />
            <span className="min-w-0 flex-1 truncate">{project?.name ?? t("status.selectProject")}</span>
            <ChevronRight aria-hidden size={13} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
            {projects.slice(0, 8).map(item => <DropdownMenuItem key={item.id} onClick={() => select(item)}>
                {item.name}
            </DropdownMenuItem>)}
            {!projects.length && <p className="px-2 py-1.5 text-sm text-muted-foreground">{t("status.noProjects")}</p>}
            <DropdownMenuItem render={<Link to={ROUTES.projects} />} className="text-primary">
                {t("status.viewAllProjects")}
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>;
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
        <Button variant="ghost" type="button" onClick={signOut} aria-label={t("actions.signOut")}
            className="mt-1 h-auto w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <LogOut aria-hidden size={18} />{!collapsed && t("actions.signOut")}
        </Button>
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
                <Link to={ROUTES.dashboard} aria-label={name} className="flex min-w-0 items-center gap-2 truncate text-label-sm font-medium">
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
