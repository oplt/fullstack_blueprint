import { ChevronRight, FolderKanban, LogOut, X, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../features/identity/useAuth";
import { useUserProfile } from "../features/identity/useUserProfile";
import { useApplicationConfiguration } from "./configuration";
import { ROUTES } from "./routes";
import type { Project } from "@/features/projects/api";
import { getInitials } from "@/lib/formatters";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
type Page = { label: string; path: string; icon: LucideIcon };
type SidebarProps = { collapsed: boolean; projectsEnabled: boolean; name: string; pages: Page[]; settings: Page[]; active?: string; projects: Project[]; project?: Project; close?: () => void; select: (project: Project) => void; signOut: () => void };
function ProjectSelector({ projects, project, select }: Pick<SidebarProps, "projects" | "project" | "select">) {
    const { t } = useTranslation();
    return <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="ui-sidebar-project" />}><FolderKanban aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{project?.name ?? t("status.selectProject")}</span><ChevronRight aria-hidden="true" /></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="ui-sidebar-project-menu">
            {projects.slice(0, 8).map(item => <DropdownMenuItem key={item.id} onClick={() => select(item)}>{item.name}</DropdownMenuItem>)}
            {!projects.length && <p className="ui-sidebar-no-projects">{t("status.noProjects")}</p>}
            <DropdownMenuItem render={<Link to={ROUTES.projects} />} className="text-primary">{t("status.viewAllProjects")}</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>;
}
function SidebarAccount({ collapsed, signOut }: Pick<SidebarProps, "collapsed" | "signOut">) {
    const { t } = useTranslation(); const { currentUser } = useAuth(); const { data: profile } = useUserProfile();
    return <div className="ui-sidebar-account">
        <Link to={ROUTES.profile} aria-label={t("navigation.openProfile")} className="ui-sidebar-account-link"><Avatar><AvatarImage src={profile?.avatar_url ?? undefined} alt="" /><AvatarFallback>{currentUser && getInitials(currentUser.full_name, currentUser.email)}</AvatarFallback></Avatar>{!collapsed && <span className="truncate text-body-md">{currentUser?.full_name ?? currentUser?.email ?? t("status.profile")}</span>}</Link>
        <Button variant="ghost" type="button" onClick={signOut} aria-label={t("actions.signOut")} className="ui-sidebar-sign-out"><LogOut aria-hidden="true" />{!collapsed && t("actions.signOut")}</Button>
    </div>;
}
export function WorkspaceSidebar(props: SidebarProps) {
    const { t } = useTranslation(); const { branding } = useApplicationConfiguration(); const { collapsed, name, close } = props;
    function pageLink(page: Page) {
        const active = page.path === props.active; const Icon = page.icon;
        return <Link key={page.path} to={page.path} onClick={close} aria-label={page.label} title={collapsed ? page.label : undefined} aria-current={active ? "page" : undefined} className="ui-sidebar-link"><Icon aria-hidden="true" />{!collapsed && page.label}</Link>;
    }
    return <>
        <div className="ui-sidebar-brand-wrap"><div className="ui-sidebar-head"><Link to={ROUTES.dashboard} aria-label={name} className="ui-sidebar-brand">{branding.logo && <img src={branding.logo} alt={branding.logoAlt ?? name} className="ui-sidebar-logo" />}{collapsed ? name.slice(0, 1) : name}</Link><Button variant="ghost" size="icon" className="md:hidden" aria-label={t("navigation.closeNavigation")} onClick={close} type="button"><X aria-hidden="true" /></Button></div>{props.projectsEnabled && !collapsed && <ProjectSelector projects={props.projects} project={props.project} select={props.select} />}</div>
        <nav aria-label={t("navigation.main")} className="ui-sidebar-nav">{props.pages.map(pageLink)}{!!props.settings.length && <div className="ui-sidebar-settings"><p className={collapsed ? "sr-only" : "ui-sidebar-settings-label"}>{t("navigation.settings")}</p>{props.settings.map(pageLink)}</div>}</nav>
        <SidebarAccount collapsed={collapsed} signOut={props.signOut} />
    </>;
}
