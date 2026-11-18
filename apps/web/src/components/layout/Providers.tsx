"use client";

import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/Tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            fontSize: "13px",
          },
        }}
      />
    </TooltipProvider>
  );
}
