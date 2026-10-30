"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  CalendarDays, ChevronDown, Download, KeyRound, LogOut, Menu, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Sun, TriangleAlert,
  UserRound,
} from "lucide-react";

import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { PasswordCard } from "@/components/auth/password-card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROLE_LABELS } from "@/lib/format";
import { navForRole } from "@/lib/navigation";
import { useInstallPrompt, useStandalone } from "@/lib/pwa";
import { saveSidebarCollapsed } from "@/lib/sidebar";
import { cn } from "@/lib/utils";

export function AppShell({ children, initial, sidebarCollapsed = false }) {
  return (
    <AuthProvider initial={initial}>
      <NotificationProvider>
        <ShellLayout initialCollapsed={sidebarCollapsed}>{children}</ShellLayout>
      </NotificationProvider>
    </AuthProvider>
  );
}

function ShellLayout({ children, initialCollapsed }) {
  const { user, institution, loading, error, reload } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop only: collapse the sidebar to an icon rail to give wide tables more room.
  const [railed, setRailed] = useState(initialCollapsed);
  const toggleRail = useCallback(() => {
    setRailed((previous) => {
      saveSidebarCollapsed(!previous);
      return !previous;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      // Ctrl+B or Cmd+B, as in most editors; ignored while typing in a field.
      if (event.key.toLowerCase() !== "b" || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (event.target.closest?.("input, textarea, select, [contenteditable=true]")) return;
      event.preventDefault();
      toggleRail();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleRail]);

  if (loading) return <ShellSkeleton />;
  if (error || !user) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
        <TriangleAlert className="size-8 text-destructive" />
        <p className="font-medium">We could not load your account.</p>
        <p className="text-sm text-muted-foreground">Check that the API server is running, then try again.</p>
        <Button onClick={reload}>Try again</Button>
      </div>
    );
  }

  const brand = institution?.primary_color;
  if (user.must_change_password) {
    return <ChooseOwnPassword user={user} institution={institution} onChanged={reload} />;
  }
  return (
    <div
      className="min-h-svh bg-muted/30"
      style={brand ? { "--primary": brand, "--sidebar-primary": brand, "--ring": brand } : undefined}
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col",
          railed ? "w-16" : "w-64",
        )}
        data-collapsed={railed || undefined}
      >
        <SidebarContent rail={railed} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex h-full w-72 flex-col bg-sidebar p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className={cn("transition-[padding] duration-200", railed ? "lg:pl-16" : "lg:pl-64")}>
        <TopBar onMenu={() => setMobileOpen(true)} railed={railed} onToggleRail={toggleRail} />
        <main className={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:px-8", railed ? "max-w-[100rem]" : "max-w-7xl")}>
          {children}
        </main>
      </div>
    </div>
  );
}

/** First sign-in with a temporary password: nothing else is available until it is changed (the API enforces this too). */
function ChooseOwnPassword({ user, institution, onChanged }) {
  const { logout } = useAuth();
  const brand = institution?.primary_color;
  return (
    <div
      className="flex min-h-svh items-center justify-center bg-muted/30 p-4"
      style={brand ? { "--primary": brand, "--ring": brand } : undefined}
    >
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-1 size-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Welcome, {user.first_name}</h1>
            <p className="text-sm text-muted-foreground">
              You signed in with a temporary password. Choose your own password to continue.
            </p>
          </div>
        </div>
        <PasswordCard
          title="Choose your password"
          currentLabel="Temporary password"
          description="Use at least 10 characters that only you know. Avoid common words, personal details or only numbers."
          onChanged={onChanged}
        />
        <Button variant="ghost" onClick={logout}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );
}

const COLLAPSED_KEY = "sis.sidebar.collapsed";
const COLLAPSED_EVENT = "sis-sidebar-collapsed";

// Collapsed menu groups live in localStorage. Reading them through useSyncExternalStore lets
// the server and the first browser render agree (nothing collapsed), then applies the saved
// state right after hydration, so there is no hydration mismatch.
function subscribeCollapsed(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(COLLAPSED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COLLAPSED_EVENT, callback);
  };
}

function readCollapsedSnapshot() {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) || "[]";
  } catch {
    return "[]"; // storage unavailable (private mode): the menu still works, it just forgets
  }
}

function writeCollapsed(labels) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(labels));
  } catch {
    // see readCollapsedSnapshot
  }
  window.dispatchEvent(new Event(COLLAPSED_EVENT));
}

function parseCollapsed(snapshot) {
  try {
    const labels = JSON.parse(snapshot);
    return new Set(Array.isArray(labels) ? labels : []);
  } catch {
    return new Set();
  }
}

function SidebarContent({ onNavigate, rail = false }) {
  const { user, institution } = useAuth();
  const pathname = usePathname();
  const sections = navForRole(user.role);
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const collapsedSnapshot = useSyncExternalStore(subscribeCollapsed, readCollapsedSnapshot, () => "[]");
  const collapsed = useMemo(() => parseCollapsed(collapsedSnapshot), [collapsedSnapshot]);
  const navRef = useRef(null);
  const isActive = (href) => {
    if (pathname === href) return true;
    if (!pathname.startsWith(`${href}/`)) return false;
    // Prefer the most specific matching item, e.g. /students/new over /students.
    return !allHrefs.some((other) => other !== href && other.startsWith(href) && pathname.startsWith(other));
  };

  useEffect(() => {
    // Keep the current page visible in a long menu.
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  function toggle(label) {
    const next = new Set(collapsed);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    writeCollapsed([...next]);
  }

  const logo = institution?.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={institution.logo} alt="" className="size-8 shrink-0 rounded object-contain" />
  ) : (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-semibold leading-none text-primary-foreground">
      {(institution?.short_name || "SIS").slice(0, 4)}
    </div>
  );

  if (rail) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <Link
          href="/dashboard"
          className="flex h-16 shrink-0 items-center justify-center border-b"
          aria-label={`${institution?.short_name || "SIS"} dashboard`}
        >
          {logo}
        </Link>
        <nav ref={navRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3" aria-label="Main">
          {sections.map((section, index) => (
            <ul key={section.label} className={cn("space-y-1", index > 0 && "mt-2 border-t pt-2")} aria-label={section.label}>
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          aria-label={item.label}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex h-9 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            active && "bg-sidebar-accent text-sidebar-foreground",
                          )}
                        >
                          <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link href="/dashboard" onClick={onNavigate} className="flex h-16 shrink-0 items-center gap-3 border-b px-5">
        {logo}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{institution?.short_name || "SIS"}</p>
          <p className="truncate text-xs text-muted-foreground">{institution?.name}</p>
        </div>
      </Link>
      <nav
        ref={navRef}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-gutter:stable]"
        aria-label="Main"
      >
        {sections.map((section) => {
          const containsActive = section.items.some((item) => isActive(item.href));
          const isOpen = section.items.length === 1 || containsActive || !collapsed.has(section.label);
          const listId = `nav-${section.label.toLowerCase().replace(/\W+/g, "-")}`;
          return (
            <div key={section.label} className="pb-1">
              {section.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggle(section.label)}
                  aria-expanded={isOpen}
                  aria-controls={listId}
                  disabled={containsActive}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:cursor-default disabled:hover:text-muted-foreground"
                >
                  {section.label}
                  <ChevronDown className={cn("size-3.5 transition-transform", !isOpen && "-rotate-90")} />
                </button>
              )}
              {isOpen && (
                <ul id={listId} className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            active && "bg-sidebar-accent font-medium text-sidebar-foreground",
                          )}
                        >
                          <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

function TopBar({ onMenu, railed, onToggleRail }) {
  const { user, period, logout } = useAuth();
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Menu />
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={onToggleRail}
            aria-label={railed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={railed}
          >
            {railed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{railed ? "Expand sidebar" : "Collapse sidebar"} (Ctrl+B)</TooltipContent>
      </Tooltip>
      <div className="hidden min-w-0 flex-1 md:block">
        <Breadcrumbs />
      </div>
      <div className="ml-auto flex items-center gap-2">
        {period ? (
          <Badge variant="outline" className="hidden gap-1.5 py-1 sm:inline-flex">
            <CalendarDays className="size-3.5" />
            {period.academic_year_name} · {period.name}
            {period.registration_open && <span className="ml-1 size-1.5 rounded-full bg-emerald-500" title="Registration open" />}
          </Badge>
        ) : (
          <Badge variant="outline" className="hidden sm:inline-flex">No current semester</Badge>
        )}
        <NotificationBell />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account menu">
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">{initials || "?"}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">{user.first_name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{user.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserRound /> My account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile#password">
                <KeyRound /> Change password
              </Link>
            </DropdownMenuItem>
            <InstallMenuItem />
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function InstallMenuItem() {
  const { canInstall, install } = useInstallPrompt();
  const standalone = useStandalone();
  if (standalone) return null;
  if (canInstall) {
    return (
      <DropdownMenuItem onSelect={install}>
        <Download /> Install app
      </DropdownMenuItem>
    );
  }
  // iPhone and iPad have no install prompt: the profile page explains Add to Home Screen.
  return (
    <DropdownMenuItem asChild>
      <Link href="/profile#notifications">
        <Download /> Install app
      </Link>
    </DropdownMenuItem>
  );
}

function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setTheme("light")}>
          <Sun /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("dark")}>
          <Moon /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("system")}>
          <Monitor /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ShellSkeleton() {
  return (
    <div className="min-h-svh bg-muted/30">
      <div className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar p-5 lg:block">
        <Skeleton className="h-8 w-32" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
      <div className="lg:pl-64">
        <div className="h-16 border-b bg-background" />
        <div className="mx-auto max-w-7xl space-y-4 p-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    </div>
  );
}
