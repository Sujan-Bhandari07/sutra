"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Plug, Settings } from "lucide-react";
import { toast } from "sonner";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/Dropdown";
import { signOut } from "@/services/auth";
import { useAppStore } from "@/store/app-store";
import { cn, initials } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-elevated text-xs font-medium text-secondary",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function UserProfileMenu({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const name = user?.name ?? "Your account";

  async function handleLogout() {
    await signOut();
    toast.success("Logged out");
    router.push("/login");
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-elevated data-[state=open]:bg-elevated",
            collapsed && "justify-center",
          )}
          aria-label="Account menu"
        >
          <Avatar name={name} />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-tight">{user ? user.name : "Loading..."}</span>
                <span className="block truncate text-xs text-muted">{user?.email ?? ""}</span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted" />
            </>
          )}
        </button>
      </DropdownTrigger>
      <DropdownContent side={collapsed ? "right" : "top"} align="start" className="w-60">
        <DropdownLabel>{user?.email ?? "Signed in"}</DropdownLabel>
        <DropdownItem onSelect={() => { onNavigate?.(); router.push("/settings"); }}>
          <Settings className="size-4" /> Settings
        </DropdownItem>
        <DropdownItem onSelect={() => { onNavigate?.(); router.push("/integrations"); }}>
          <Plug className="size-4" /> Integrations
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onSelect={handleLogout}>
          <LogOut className="size-4" /> Log out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
