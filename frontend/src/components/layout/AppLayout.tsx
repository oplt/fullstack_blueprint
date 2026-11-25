import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Bot, CalendarDays, ChevronLeft, ChevronRight, Command, FolderKanban, LayoutDashboard, LogOut, Menu, Moon, Search, Settings, ShieldCheck, Sun, UserRound, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { usePlatformMetadata } from "../../hooks/usePlatformMetadata";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useNotifications } from "../../hooks/useNotifications";
import { useColorMode } from "../../app/colorModeContext";
import { useSnackbar } from "../../app/snackbarContext";
import { useSettingsTabs, getSettingsHubLabel } from "../../hooks/useSettingsTabs";
import { NotificationNavBadge } from "./NotificationNavBadge";
import { layoutContentClass, layoutVariantForPath } from "./layoutVariants";
import { getInitials } from "../../utils/formatters";
import { listProjects, type Project } from "../../api/projects";
import { queryKeys } from "../../config/queryKeys";
import { projectPath, ROUTES } from "../../app/routes";
import { LanguageSelector } from "../ui/LanguageSelector";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Sheet, SheetContent } from "../ui/sheet";
import { SkipToContentLink } from "../ui/SkipToContentLink";
import { getConfiguredNavigation } from "../../app/configuration/configuration";
import { serverStateFromPlatformMetadata, visibleNavigation } from "../../app/configuration/capabilities";
import { useApplicationConfiguration } from "../../app/configuration/useConfiguration";
import type { NavigationEntry, NavigationIcon } from "../../app/configuration/types";

type Entry = Omit<NavigationEntry, "icon"> & { icon: typeof LayoutDashboard };
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

function ProjectSelector({ projects, selectedId, collapsed, onSelect }: { projects: Project[]; selectedId?: string; collapsed: boolean; onSelect: (project: Project) => void }) {
  if (collapsed) return null;
  const selected = projects.find((project) => project.id === selectedId);
  return <Popover><PopoverTrigger className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"><FolderKanban size={14} /><span className="min-w-0 flex-1 truncate">{selected?.name ?? "Select project"}</span><ChevronRight size={13} /></PopoverTrigger><PopoverContent align="start" className="w-64 p-1">{projects.length ? projects.slice(0, 8).map((project) => <button type="button" key={project.id} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => onSelect(project)}>{project.name}</button>) : <p className="p-3 text-sm text-muted-foreground">No projects available.</p>}<Link to="/projects" className="block rounded-md px-3 py-2 text-sm text-primary hover:bg-muted">View all projects</Link></PopoverContent></Popover>;
}

export function AppLayout() {
  const location = useLocation(); const navigate = useNavigate();
  const { logout, currentUser } = useAuth(); const { data: metadata } = usePlatformMetadata(); const { t } = useTranslation();
  const applicationConfiguration = useApplicationConfiguration();
  const applicationName = metadata?.app_name ?? applicationConfiguration.appName;
  const { data: profile } = useUserProfile(); const settingsTabs = useSettingsTabs();
  const { data: notifications } = useNotifications();
  const { colorMode, setColorMode } = useColorMode(); const { showToast } = useSnackbar();
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(SIDEBAR_KEY) === "true");
  const [mobileOpen, setMobileOpen] = useState(false); const [commandOpen, setCommandOpen] = useState(false); const [search, setSearch] = useState(""); const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(() => typeof window !== "undefined" ? window.localStorage.getItem("blueprint.selected-project") ?? undefined : undefined);
  const projectQuery = useQuery({ queryKey: queryKeys.projects.all, queryFn: ({ signal }) => listProjects({ signal }), enabled: applicationConfiguration.enabledCapabilities.includes("projects"), staleTime: 60_000 });
  useEffect(() => { localStorage.setItem(SIDEBAR_KEY, String(collapsed)); }, [collapsed]);
  useEffect(() => { if (selectedProjectId) localStorage.setItem("blueprint.selected-project", selectedProjectId); }, [selectedProjectId]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(v => !v); } if (event.key === "/" && !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement).tagName)) { event.preventDefault(); setCommandOpen(true); } if (event.key === "Escape") { setCommandOpen(false); setMobileOpen(false); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  const entries = useMemo<Entry[]>(() => visibleNavigation(getConfiguredNavigation(applicationConfiguration), applicationConfiguration, serverStateFromPlatformMetadata(metadata)).map(item => ({ ...item, icon: NAV_ICONS[item.icon], label: item.capability === "projects" ? metadata?.core_domain_plural ?? t(item.translationKey ?? item.label) : t(item.translationKey ?? item.label) })), [applicationConfiguration, metadata, t]);
  const title = getSettingsHubLabel(location.pathname, settingsTabs) ?? entries.find(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))?.label ?? (location.pathname === ROUTES.notifications ? t("navigation.notifications") : t("navigation.workspace"));
  const crumbs = location.pathname.split("/").filter(Boolean);
  const projectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? selectedProjectId;
  const selectedProject = projectQuery.data?.find(project => project.id === projectId);
  const commands = [...entries, { label: "Notifications", path: ROUTES.notifications, icon: Bell }, { label: "Settings", path: ROUTES.profile, icon: Settings }].filter(item => item.label.toLowerCase().includes(search.toLowerCase()));
  async function signOut() { try { await logout(); navigate("/", { replace: true }); } catch { showToast({ message: t("status.couldNotSignOut"), severity: "error" }); } }
  function go(path: string) { navigate(path); setMobileOpen(false); setCommandOpen(false); }
  const sidebar = <>
    <div className="px-4"><div className="flex h-16 items-center justify-between"><Link to={ROUTES.dashboard} className="flex min-w-0 items-center gap-2 truncate font-semibold tracking-tight" aria-label={applicationName}>{applicationConfiguration.branding.logo ? <img src={applicationConfiguration.branding.logo} alt={applicationConfiguration.branding.logoAlt ?? applicationName} className="h-7 w-7 shrink-0 rounded object-contain" /> : null}{collapsed ? applicationName.slice(0, 1) : applicationName}</Link><button className="rounded-md p-2 hover:bg-muted md:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18}/></button></div><ProjectSelector projects={projectQuery.data ?? []} selectedId={projectId} collapsed={collapsed} onSelect={(project) => { setSelectedProjectId(project.id); go(projectPath(project.id)); }} /></div>
    <nav aria-label={t("navigation.main")} className="flex-1 space-y-1 px-2">{entries.map(item => { const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`); const Icon = item.icon; return <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon size={18}/>{!collapsed && item.label}</Link>; })}
    <div className="mt-5 border-t pt-3"><p className={`px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${collapsed ? "sr-only" : ""}`}>Settings</p>{settingsTabs.map(item => <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} aria-current={location.pathname === item.path ? "page" : undefined} title={collapsed ? item.label : undefined} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Settings size={17}/>{!collapsed && item.label}</Link>)}</div></nav>
    <div className="border-t p-3"><Link to="/profile" className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted" aria-label="Open profile"><Avatar><AvatarImage src={profile?.avatar_url ?? undefined} alt=""/><AvatarFallback>{getInitials(currentUser?.full_name, currentUser?.email)}</AvatarFallback></Avatar><span className="min-w-0 flex-1 truncate text-sm">{!collapsed && (currentUser?.full_name ?? currentUser?.email ?? "Profile")}</span></Link><button onClick={() => void signOut()} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><LogOut size={18}/>{!collapsed && "Sign out"}</button></div>
  </>;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipToContentLink />
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-card transition-[width] md:flex ${collapsed ? "w-[4.5rem]" : "w-64"}`}>{sidebar}</aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left"><div className="flex h-full flex-col">{sidebar}</div></SheetContent></Sheet>
      <div className={collapsed ? "md:pl-[4.5rem]" : "md:pl-64"}><header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-3 backdrop-blur sm:px-6">
        <button className="rounded-md p-2 hover:bg-muted md:hidden" aria-label="Open navigation menu" onClick={() => setMobileOpen(true)}><Menu size={19}/></button><button className="hidden rounded-md p-2 hover:bg-muted md:block" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(v => !v)}>{collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}</button>
        <div className="min-w-0 flex-1"><nav aria-label="Breadcrumb" className="hidden items-center gap-1 truncate text-xs text-muted-foreground sm:flex"><Link to="/dashboard" className="hover:text-foreground">Workspace</Link>{crumbs.map((crumb, i) => <span key={`${crumb}-${i}`}> / <span className={i === crumbs.length - 1 ? "text-foreground" : ""}>{i === 1 && selectedProject ? selectedProject.name : crumb.replaceAll("-", " ")}</span></span>)}</nav><h1 className="truncate text-base font-semibold">{title}</h1></div>
        <button onClick={() => setCommandOpen(true)} className="hidden items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted sm:flex" aria-label="Search pages"><Search size={16}/> Search <kbd className="rounded bg-muted px-1.5 text-xs">⌘K</kbd></button><button onClick={() => setCommandOpen(true)} className="rounded-md p-2 hover:bg-muted sm:hidden" aria-label="Search pages"><Search size={18}/></button>
        <Popover><PopoverTrigger className="rounded-md p-2 hover:bg-muted" aria-label={t("navigation.openNotificationCenter")}><NotificationNavBadge><Bell size={18}/></NotificationNavBadge></PopoverTrigger><PopoverContent align="end" className="w-80 p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">{t("navigation.notifications")}</h2><span className="text-xs text-muted-foreground">{t("status.unread", { count: notifications?.filter(item => !item.is_read).length ?? 0 })}</span></div><p className="py-4 text-sm text-muted-foreground">{notifications?.length ? t("status.reviewNotifications") : t("status.allCaughtUp")}</p><Link to="/notifications" className="text-sm font-medium text-primary hover:underline" onClick={() => setMobileOpen(false)}>{t("navigation.openNotificationCenter")}</Link></PopoverContent></Popover><Popover><PopoverTrigger className="rounded-md p-2 hover:bg-muted" aria-label={t("navigation.openProfileMenu")}><Avatar size="sm"><AvatarFallback>{getInitials(currentUser?.full_name, currentUser?.email)}</AvatarFallback></Avatar></PopoverTrigger><PopoverContent align="end" className="w-56 p-3"><p className="font-medium">{currentUser?.full_name ?? t("status.yourProfile")}</p><p className="mb-3 truncate text-xs text-muted-foreground">{currentUser?.email ?? t("status.signedIn")}</p><Link to="/profile" className="block rounded-md px-3 py-2 text-sm hover:bg-muted">{t("navigation.profile")}</Link><button type="button" onClick={() => void signOut()} className="mt-1 flex w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-muted"><LogOut size={15} className="mr-2"/>{t("actions.signOut")}</button></PopoverContent></Popover><LanguageSelector compact /><button aria-label={t("actions.toggleTheme")} title={t("accessibility.theme", { mode: colorMode })} onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")} className="min-h-10 min-w-10 rounded-md p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{colorMode === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
      </header><main id="main-content" tabIndex={-1} className={`${layoutContentClass(layoutVariantForPath(location.pathname, applicationConfiguration.layoutVariants))} outline-none`}><Outlet/></main></div>
      {commandOpen && <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 px-4 pt-[15vh]" onMouseDown={event => { if (event.target === event.currentTarget) setCommandOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="command-title" className="w-full max-w-lg rounded-xl border bg-popover p-3 shadow-2xl"><h2 id="command-title" className="sr-only">Search pages</h2><div className="flex items-center gap-2 border-b px-2 pb-3"><Command size={17}/><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search pages and settings..." className="w-full bg-transparent p-2 outline-none" aria-label="Search pages and settings"/></div><div className="max-h-72 overflow-auto py-2">{commands.length ? commands.map(item => <button key={item.path} onClick={() => go(item.path)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"><item.icon size={17}/>{item.label}</button>) : <p className="p-4 text-sm text-muted-foreground">No matching pages.</p>}</div></section></div>}
    </div>
  );
}
