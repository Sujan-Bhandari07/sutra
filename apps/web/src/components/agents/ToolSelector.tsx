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

  const disconnectedSelected = TOOLS.filter(
    (t) => value.includes(t.id) && !loading && !integrations.find((i) => i.tool === t.id)?.connected,
  );

  return (
    <div>
      <ul className="space-y-2.5" role="group" aria-label="Tools">
        {TOOLS.map(({ id, label, toolDescription, Icon }) => {
          const selected = value.includes(id);
          const connected = integrations.find((i) => i.tool === id)?.connected ?? false;
          return (
            <li
              key={id}
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-surface transition-colors",
                selected ? "border-primary/60 bg-primary/[0.06]" : "border-border hover:border-muted/50",
              )}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(id)}
                className="flex min-w-0 flex-1 items-center gap-3.5 rounded-xl p-3.5 text-left"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-[13px] leading-snug text-secondary">{toolDescription}</span>
                  <ConnectionStatus connected={connected} loading={loading} className="mt-1.5" />
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
                  Connect
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {disconnectedSelected.length > 0 && (
        <p className="mt-3 text-[13px] leading-relaxed text-secondary">
          {disconnectedSelected.map((t) => t.label).join(" and ")} {disconnectedSelected.length > 1 ? "aren't" : "isn't"}{" "}
          connected yet. You can save the agent now, but it can't use{" "}
          {disconnectedSelected.length > 1 ? "them" : "it"} until you{" "}
          <Link href="/integrations" className="text-primary underline underline-offset-4">
            connect {disconnectedSelected.length > 1 ? "them" : "it"}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
