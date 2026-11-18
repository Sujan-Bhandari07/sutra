"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { isToday, isWithinInterval, subDays } from "date-fns";
import { PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { Tooltip } from "@/components/ui/Tooltip";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { NavLink, SETTINGS_NAV, SidebarNavigation } from "./SidebarNavigation";
import { UserProfileMenu } from "./UserProfileMenu";
import { useAppStore } from "@/store/app-store";
import type { Conversation } from "@/types";
import { cn } from "@/lib/utils";

function groupConversations(conversations: Conversation[]) {
  const sorted = [...conversations].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const now = new Date();
  const week = { start: subDays(now, 7), end: now };
  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const c of sorted) {
    const d = new Date(c.updatedAt);
    if (isToday(d)) groups[0].items.push(c);
    else if (isWithinInterval(d, week)) groups[1].items.push(c);
    else groups[2].items.push(c);
  }
  return groups.filter((g) => g.items.length);
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const router = useRouter();
  const conversations = useAppStore((s) => s.conversations);
  const activeId = useAppStore((s) => s.activeConversationId);
  const newChat = useAppStore((s) => s.newChat);
  const selectConversation = useAppStore((s) => s.selectConversation);
  const deleteConversation = useAppStore((s) => s.deleteConversation);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);

  const groups = groupConversations(conversations);

  function handleNewChat() {
    newChat();
    onNavigate?.();
    router.push("/chat");
  }

  function openConversation(id: string) {
    selectConversation(id);
    onNavigate?.();
    router.push("/chat");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex h-14 shrink-0 items-center px-3", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? (
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-primary">
            <LogoMark className="size-[18px]" />
          </span>
        ) : (
          <Logo />
        )}
        {!collapsed && !onNavigate && (
          <Tooltip label="Collapse sidebar">
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-elevated hover:text-foreground"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </Tooltip>
        )}
      </div>

      <div className="space-y-3 px-3 pb-2">
        {collapsed ? (
          <Tooltip label="New chat" side="right">
            <button
              onClick={handleNewChat}
              aria-label="New chat"
              className="flex h-9 w-full items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-hover"
            >
              <Plus className="size-4" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={handleNewChat}
            className="flex h-9 w-full items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            <Plus className="size-4" /> New chat
          </button>
        )}
        <SidebarNavigation collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      {collapsed ? (
        <div className="flex-1" />
      ) : (
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {groups.length === 0 ? (
            <p className="px-2.5 pt-2 text-[13px] leading-relaxed text-muted">Your conversations will show up here.</p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-3">
                <h2 className="px-2.5 pb-1 pt-2 text-xs font-medium text-muted">{group.label}</h2>
                <ul className="space-y-0.5">
                  {group.items.map((c) => (
                    <li key={c.id} className="group relative">
                      <button
                        onClick={() => openConversation(c.id)}
                        aria-current={c.id === activeId ? "true" : undefined}
                        className={cn(
                          "block h-8 w-full truncate rounded-lg pl-2.5 pr-8 text-left text-[13px] transition-colors",
                          c.id === activeId
                            ? "bg-elevated text-foreground"
                            : "text-secondary hover:bg-elevated/70 hover:text-foreground",
                        )}
                      >
                        {c.title}
                      </button>
                      <button
                        onClick={() => setPendingDelete(c)}
                        aria-label={`Delete conversation: ${c.title}`}
                        className="absolute right-1 top-1 rounded-md p-1 text-muted opacity-0 transition hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}

      <div className="shrink-0 space-y-0.5 border-t border-border p-3">
        <NavLink item={SETTINGS_NAV} collapsed={collapsed} onNavigate={onNavigate} />
        <UserProfileMenu collapsed={collapsed} onNavigate={onNavigate} />
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this conversation?"
        description={pendingDelete ? `"${pendingDelete.title}" and its messages will be removed. This can't be undone.` : ""}
        confirmLabel="Delete conversation"
        onConfirm={() => {
          if (pendingDelete) {
            deleteConversation(pendingDelete.id);
            toast.success("Conversation deleted");
          }
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

/** Desktop sidebar: collapses to an icon rail. */
export function AppSidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 ease-out md:block",
        collapsed ? "w-16" : "w-[264px]",
      )}
    >
      <SidebarBody collapsed={collapsed} />
      {collapsed && (
        <Tooltip label="Expand sidebar" side="right">
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="absolute -right-3 top-4 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
          >
            <PanelLeftOpen className="size-3.5" />
          </button>
        </Tooltip>
      )}
    </aside>
  );
}

/** Mobile drawer (below md). */
export function MobileSidebar() {
  const open = useAppStore((s) => s.mobileNavOpen);
  const setOpen = useAppStore((s) => s.setMobileNavOpen);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60 md:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 w-[288px] max-w-[85vw] border-r border-border bg-sidebar shadow-2xl md:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <SidebarBody collapsed={false} onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
