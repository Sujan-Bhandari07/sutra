"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bot, MessageSquare, PlusCircle, Plug, Settings, type LucideIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/chat", label: "Chat", icon: MessageSquare, isActive: (p) => p.startsWith("/chat") },
  {
    href: "/agents",
    label: "Explore agents",
    icon: Bot,
    isActive: (p) => p === "/agents" || (p.startsWith("/agents/") && !p.startsWith("/agents/create")),
  },
  { href: "/agents/create", label: "Create agent", icon: PlusCircle, isActive: (p) => p.startsWith("/agents/create") },
  { href: "/integrations", label: "Integrations", icon: Plug, isActive: (p) => p.startsWith("/integrations") },
  { href: "/activity", label: "Activity", icon: Activity, isActive: (p) => p.startsWith("/activity") },
];

export const SETTINGS_NAV: NavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  isActive: (p) => p.startsWith("/settings"),
};

export function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = item.isActive(pathname);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active ? "bg-elevated text-foreground" : "text-secondary hover:bg-elevated/70 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-[17px] shrink-0", active && "text-primary")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  return collapsed ? (
    <Tooltip label={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export function SidebarNavigation({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {PRIMARY_NAV.map((item) => (
        <NavLink key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}
