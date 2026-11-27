import { notify } from "../../lib/notify";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, matchPath, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Bot, CalendarDays, ChevronLeft, ChevronRight, FolderKanban, LayoutDashboard, Menu, Search, Settings, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { usePlatformMetadata } from "../../hooks/usePlatformMetadata";
import { PageSearch } from "./PageSearch";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { NotificationMenu, ProfileMenu } from "./WorkspaceMenus";
import { ThemeSelector } from "./ThemeSelector";
import { useSettingsTabs, getSettingsHubLabel } from "../../hooks/useSettingsTabs";
import { layoutContentClass, layoutVariantForPath } from "./layoutVariants";
import { listProjects, type Project } from "../../api/projects";
import { queryKeys } from "../../config/queryKeys";
import { projectPath, ROUTES } from "@/config/routes";
import { LanguageSelector } from "../ui/LanguageSelector";
import { Button } from "../ui/button";
import { Sheet, SheetContent } from "../ui/sheet";
import { SkipToContentLink } from "../ui/SkipToContentLink";
import { getConfiguredNavigation } from "@/config/application/configuration";
import { serverStateFromPlatformMetadata, visibleNavigation } from "@/config/application/capabilities";
import { useApplicationConfiguration } from "@/config/application/useConfiguration";
import type { NavigationIcon } from "@/config/application/types";

const NAV_ICONS: Record<NavigationIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  calendar: CalendarDays,
  ai: Bot,
  search: Search,
  memory: Bot,
  agent: Bot,
  observability: LayoutDashboard,
  platform: Settings,
  profile: UserRound,
  notifications: Bell,
  admin: ShieldCheck,
};
const SIDEBAR_KEY = "blueprint.sidebar.collapsed";

function ShellPageTitle({ pathname, title }: { pathname: string; title: string }) {
  if (matchPath({ path: ROUTES.agent, end: true }, pathname) || matchPath({ path: ROUTES.rag, end: true }, pathname)) {
    return null;
  }
  return <h1 className="truncate text-base font-semibold">{title}</h1>;
}

function OptionalNotificationMenu({ enabled }: { enabled: boolean }) {
  return enabled ? <NotificationMenu /> : null;
}

function readPreference(key: string): string | undefined {
  try { return window.localStorage.getItem(key) ?? undefined; }
  catch { return undefined; }
}

function writePreference(key: string, value: string) {
  try { window.localStorage.setItem(key, value); }
  catch { /* Persistence is optional. */ }
}

function useShellNavigation(pathname: string) {
  const { t } = useTranslation();
  const applicationConfiguration = useApplicationConfiguration();
  const { data: metadata } = usePlatformMetadata();
  const settingsTabs = useSettingsTabs();
  const entries = visibleNavigation(
    getConfiguredNavigation(applicationConfiguration), applicationConfiguration, serverStateFromPlatformMetadata(metadata)
  ).map(item => {
    const label = t(item.translationKey ?? item.label);
    return { ...item, icon: NAV_ICONS[item.icon], label: item.capability === "projects" ? metadata?.core_domain_plural ?? label : label };
  });
  const secondaryTabs = settingsTabs.filter(tab => !entries.some(entry => entry.path === tab.path)).map(tab => ({ ...tab, icon: Settings }));
  const commands = [...entries, ...secondaryTabs];
  const activeEntry = commands.filter(item => matchPath({ path: item.path, end: false }, pathname))
    .sort((left, right) => right.path.length - left.path.length)[0];
  const title = getSettingsHubLabel(pathname, settingsTabs) ?? activeEntry?.label ?? t("navigation.workspace");
  return { entries, secondaryTabs, commands, active: activeEntry?.path, title,
    name: metadata?.app_name ?? applicationConfiguration.appName };
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const applicationConfiguration = useApplicationConfiguration();
  const navigation = useShellNavigation(location.pathname);
  const projectsEnabled = navigation.entries.some((entry) => entry.path === ROUTES.projects);
  const notificationsEnabled = navigation.commands.some((entry) => entry.path === ROUTES.notifications);
  const [collapsed, setCollapsed] = useState(() => readPreference(SIDEBAR_KEY) === "true");
  const [selectedProjectId, setSelectedProjectId] = useState(() => readPreference("blueprint.selected-project"));
  const projectQuery = useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: ({ signal }) => listProjects({ signal }),
    enabled: projectsEnabled,
    staleTime: 60_000,
  });
  useEffect(() => { writePreference(SIDEBAR_KEY, String(collapsed)); }, [collapsed]);
  useEffect(() => {
    if (selectedProjectId) writePreference("blueprint.selected-project", selectedProjectId);
  }, [selectedProjectId]);
  const crumbs = location.pathname.split("/").filter(Boolean);
  const projectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? selectedProjectId;
  const selectedProject = projectQuery.data?.find(project => project.id === projectId);
  async function signOut() {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch {
      notify({ message: t("status.couldNotSignOut"), severity: "error" });
    }
  }
  const sidebarProps = {
    name: navigation.name, pages: navigation.entries, settings: navigation.secondaryTabs, active: navigation.active, projectsEnabled,
    projects: projectQuery.data ?? [], project: selectedProject, signOut,
    select(project: Project) { setSelectedProjectId(project.id); navigate(projectPath(project.id)); },
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipToContentLink />
      <aside className={`fixed inset-y-0 left-0 z-(--z-sidebar) hidden flex-col border-r bg-card transition-[width] md:flex ${collapsed ? "w-[4.5rem]" : "w-64"}`}>
        <WorkspaceSidebar {...sidebarProps} collapsed={collapsed} />
      </aside>
      <div className={collapsed ? "md:pl-[4.5rem]" : "md:pl-64"}>
        <header className="sticky top-0 z-(--z-sticky) flex h-16 items-center gap-1 border-b bg-background/90 px-2 backdrop-blur sm:gap-3 sm:px-6">
          <MobileNavigation key={location.key} {...sidebarProps} />
          <Button variant="ghost" size="icon-sm" className="hidden md:block"
            aria-label={t(collapsed ? "navigation.expandSidebar" : "navigation.collapseSidebar")}
            onClick={() => setCollapsed(value => !value)}>
            {collapsed ? <ChevronRight className="size-4" aria-hidden="true" /> : <ChevronLeft className="size-4" aria-hidden="true" />}
          </Button>
          <div className="min-w-0 flex-1">
            <nav aria-label={t("navigation.breadcrumb")} className="hidden items-center gap-1 truncate text-xs text-muted-foreground sm:flex">
              <Link to={ROUTES.dashboard} className="hover:text-foreground">{t("navigation.workspace")}</Link>
              {crumbs.map((crumb, i) => <span key={crumb + i}> / <span className={i === crumbs.length - 1 ? "text-foreground" : ""}>
                {i === 1 && selectedProject ? selectedProject.name : crumb.replaceAll("-", " ")}
              </span></span>)}
            </nav>
            <ShellPageTitle pathname={location.pathname} title={navigation.title} />
          </div>
          <PageSearch key={location.key} pages={navigation.commands} />
          <OptionalNotificationMenu enabled={notificationsEnabled} />
          <ProfileMenu signOut={signOut} />
          <LanguageSelector compact />
          <ThemeSelector />
        </header>
        <main id="main-content" tabIndex={-1} className={`${layoutContentClass(layoutVariantForPath(location.pathname, applicationConfiguration.layoutVariants))} outline-none`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MobileNavigation(props: Omit<React.ComponentProps<typeof WorkspaceSidebar>, "collapsed" | "close">) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={t("navigation.openNavigation")} onClick={() => setOpen(true)} type="button">
      <Menu aria-hidden="true" className="size-5" />
    </Button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" title={t("navigation.main")} description={t("navigation.workspace")}>
        <WorkspaceSidebar {...props} collapsed={false} close={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  </>;
}
