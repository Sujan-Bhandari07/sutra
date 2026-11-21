"use client";

import { AppSidebar, MobileSidebar } from "./AppSidebar";
import { useAppInit } from "@/hooks/useAppInit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authReady = useAppStore((s) => s.authReady);
  const user = useAppStore((s) => s.user);
  useAppInit();
  useEffect(() => { if (authReady && !user) router.replace("/login"); }, [authReady, user, router]);
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AppSidebar />
      <MobileSidebar />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
