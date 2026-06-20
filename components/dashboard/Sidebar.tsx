"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Activity, Syringe, User, Settings, LogOut, Menu, Droplets,
  BarChart2, CalendarDays, Clock, Utensils, Shield, Dumbbell, Database,
  ChevronLeft, ChevronRight, LayoutDashboard, Sun, Moon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { loadSettings, saveSettings } from "@/lib/nightscout/settings";

const NAV = [
  { href: "/dashboard",  label: "Dashboard",  icon: Activity },
  { href: "/treatments", label: "Treatments", icon: Syringe },
  { href: "/history",    label: "History",    icon: CalendarDays },
  { href: "/reports",    label: "Reports",    icon: BarChart2 },
  { href: "/food",       label: "Food",       icon: Utensils },
  { href: "/activity",   label: "Activity",   icon: Dumbbell },
  { href: "/profile",    label: "Profile",    icon: User },
  { href: "/settings",   label: "Settings",   icon: Settings },
  { href: "/clock",      label: "Clock",      icon: Clock },
  { href: "/entries",    label: "Entries",    icon: Database },
  { href: "/admin",      label: "Admin",      icon: Shield },
];

const COLLAPSE_KEY = "ns_sidebar_collapsed";

function NavLinks({ collapsed = false, onClick }: { collapsed?: boolean; onClick?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = path === href || (href !== "/dashboard" && path.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0 py-2.5 mx-1" : "gap-3 px-3 py-2.5",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  collapsed = false,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  const [title] = useState(() => {
    if (typeof window === "undefined") return "Nightscout";
    try {
      const s = JSON.parse(localStorage.getItem("ns_settings") ?? "{}");
      return s.customTitle || "Nightscout";
    } catch { return "Nightscout"; }
  });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDark() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
    saveSettings({ ...loadSettings(), nightMode: next });
  }

  return (
    <div className="flex flex-col h-full py-3 gap-3">
      {/* Brand */}
      <div className={cn(
        "flex items-center gap-2 px-3",
        collapsed ? "justify-center px-0 mx-auto" : ""
      )}>
        <Droplets size={22} className="text-primary shrink-0" />
        {!collapsed && <span className="font-bold text-base tracking-tight truncate">{title}</span>}
      </div>

      <Separator />

      <NavLinks collapsed={collapsed} onClick={onNavigate} />

      <Separator />

      {/* Customize dashboard shortcut */}
      {!collapsed && (
        <Link
          href="/dashboard/customize"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mx-1"
        >
          <LayoutDashboard size={15} className="shrink-0" />
          Customize Home
        </Link>
      )}

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(
          "flex items-center rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
          collapsed ? "justify-center py-2.5 mx-1" : "gap-3 px-3 py-2.5 mx-1"
        )}
      >
        {isDark ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
        {!collapsed && (isDark ? "Light mode" : "Dark mode")}
      </button>

      {/* Sign out */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        title={collapsed ? "Sign out" : undefined}
        className={cn(
          "flex items-center rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-muted transition-colors",
          collapsed ? "justify-center py-2.5 mx-1" : "gap-3 px-3 py-2.5 mx-1"
        )}
      >
        <LogOut size={18} className="shrink-0" />
        {!collapsed && "Sign out"}
      </button>

      {/* Collapse toggle — desktop only */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors py-2",
            collapsed ? "justify-center mx-1" : "gap-2 px-3 mx-1"
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/** Desktop: fixed left sidebar, collapsible */
export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "true"
  );

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 border-r bg-card h-screen sticky top-0 transition-all duration-200 overflow-hidden",
        collapsed ? "w-14" : "w-52"
      )}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={toggleCollapse} />
    </aside>
  );
}

/** Mobile: hamburger → Sheet */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu size={20} />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-52">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
