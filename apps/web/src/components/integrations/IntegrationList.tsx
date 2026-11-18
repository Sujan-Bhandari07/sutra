"use client";

import { AlertCircle, Info } from "lucide-react";
import { IntegrationCard } from "./IntegrationCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAppStore } from "@/store/app-store";

export function IntegrationList() {
  const integrations = useAppStore((s) => s.integrations);
  const status = useAppStore((s) => s.integrationsStatus);
  const load = useAppStore((s) => s.loadIntegrations);

  if (status === "error") {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load your integrations"
        description="Something went wrong while checking your connections. Try again."
        action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-secondary">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Demo mode: connections are simulated in this browser. No real account is linked until the backend is
          connected.
        </p>
      </div>

      {status === "idle" || status === "loading"
        ? [0, 1, 2].map((i) => <LoadingSkeleton key={i} className="h-44 w-full rounded-xl" />)
        : integrations.map((i) => <IntegrationCard key={i.tool} integration={i} />)}
    </div>
  );
}
