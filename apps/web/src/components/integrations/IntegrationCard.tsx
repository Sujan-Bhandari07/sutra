"use client";

import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConnectionStatus } from "./ConnectionStatus";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useAppStore } from "@/store/app-store";
import type { Integration } from "@/types";
import { TOOL_BY_ID } from "@/lib/tools";

export function IntegrationCard({ integration }: { integration: Integration }) {
  const meta = TOOL_BY_ID[integration.tool];
  const connect = useAppStore((s) => s.connectIntegration);
  const disconnect = useAppStore((s) => s.disconnectIntegration);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleConnect() {
    setError(null);
    setBusy(true);
    try {
      await connect(integration.tool);
      toast.success(`${meta.label} connected`);
    } catch {
      setError(`We couldn't connect ${meta.label}. Try again in a moment.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnect(integration.tool);
      toast.success(`${meta.label} disconnected`);
      setConfirming(false);
    } catch {
      toast.error(`Couldn't disconnect ${meta.label}. Try again.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-elevated">
          <meta.Icon className="size-6" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-base font-medium">{meta.label}</h2>
            <ConnectionStatus connected={integration.connected} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-secondary">{meta.integrationDescription}</p>

          {integration.connected && integration.account && (
            <p className="mt-3 text-[13px] text-secondary">
              Signed in as <span className="font-medium text-foreground">{integration.account}</span>
              {integration.connectedAt && <span className="text-muted"> since {format(new Date(integration.connectedAt), "MMM d, yyyy")}</span>}
            </p>
          )}

          <ul className="mt-4 space-y-1.5" aria-label={`${meta.label} access`}>
            {meta.permissions.map((p) => (
              <li key={p} className="flex items-center gap-2 text-[13px] text-muted">
                <Check className="size-3.5 shrink-0" /> {p}
              </li>
            ))}
          </ul>

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px]">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
              {error}
            </div>
          )}
        </div>

        <div className="shrink-0">
          {integration.connected ? (
            <Button variant="outlineDanger" onClick={() => setConfirming(true)} disabled={busy} className="w-full sm:w-auto">
              Disconnect
            </Button>
          ) : (
            <Button variant="primary" onClick={handleConnect} loading={busy} className="w-full sm:w-auto">
              {busy ? "Connecting..." : error ? "Try again" : "Connect"}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Disconnect ${meta.label}?`}
        description={`Agents that use ${meta.label} will stop being able to act on your behalf until you reconnect it.`}
        confirmLabel="Disconnect"
        loading={busy}
        onConfirm={handleDisconnect}
      />
    </article>
  );
}
