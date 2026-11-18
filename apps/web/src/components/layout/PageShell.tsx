import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { cn } from "@/lib/utils";

/** Standard page chrome for non-chat routes: sticky header plus a centered column. */
export function PageShell({
  title,
  subtitle,
  actions,
  children,
  width = "max-w-5xl",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  return (
    <>
      <AppHeader title={title} subtitle={subtitle} actions={actions} />
      <div className={cn("mx-auto w-full px-4 py-8 sm:px-6", width)}>{children}</div>
    </>
  );
}
