"use client";

import { AppSidebar, MobileSidebar } from "./AppSidebar";
import { useAppInit } from "@/hooks/useAppInit";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  useAppInit();
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AppSidebar />
      <MobileSidebar />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
