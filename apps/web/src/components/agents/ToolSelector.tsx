"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { ConnectionStatus } from "@/components/integrations/ConnectionStatus";
import { TOOLS } from "@/lib/tools";
import { useAppStore } from "@/store/app-store";
import type { AgentTool } from "@/types";
import { cn } from "@/lib/utils";

export function ToolSelector({
  value,
  onChange,
}: {
  value: AgentTool[];
  onChange: (next: AgentTool[]) => void;
}) {
  const integrations = useAppStore((s) => s.integrations);
  const status = useAppStore((s) => s.integrationsStatus);
  const loading = status === "idle" || status === "loading";

  const toggle = (tool: AgentTool) =>
    onChange(value.includes(tool) ? value.filter((t) => t !== tool) : [...value, tool]);

  return (
    <div>
      <fieldset>
      <legend className="sr-only">Tools</legend>
      <ul className="space-y-2.5">
        {TOOLS.map(({ id, label, toolDescription, Icon }) => {
          const selected = value.includes(id);
          const connected = integrations.find((i) => i.tool === id)?.connected ?? false;
          return (
            <li
              key={id}
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-surface transition-colors",
                selected ? "border-primary/60 bg-primary/[0.06]" : "border-border",
                connected && !loading && "hover:border-muted/50",
              )}
            >
              <button
                type="button"
                aria-pressed={selected}
                disabled={loading || (!connected && !selected)}
                onClick={() => !loading && (connected || selected) && toggle(id)}
                className="flex min-w-0 flex-1 items-center gap-3.5 rounded-xl p-3.5 text-left"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-[13px] leading-snug text-secondary">{toolDescription}</span>
                  <ConnectionStatus connected={connected} loading={loading} className="mt-1.5" />
                  {!loading && !connected && <span className="mt-1 block text-xs text-muted">Connect this integration before assigning it.</span>}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    selected ? "border-primary bg-primary text-on-primary" : "border-border",
                  )}
                >
                  {selected && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </button>
              {!loading && !connected && (
                <Link
                  href="/integrations"
                  className="mr-3.5 shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-elevated"
                >
                  Go to Integrations
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      </fieldset>
      {status === "error" && <p role="alert" className="mt-3 text-[13px] text-danger">We couldn't check your integrations. Reload the page before assigning tools.</p>}
    </div>
  );
}
