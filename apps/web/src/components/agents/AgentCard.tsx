import Link from "next/link";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { AgentAvatar } from "./AgentAvatar";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { TOOL_BY_ID } from "@/lib/tools";
import type { AgentRecord } from "@/types";

export function AgentCard({
  agent,
  onOpenChat,
  onDelete,
}: {
  agent: AgentRecord;
  onOpenChat: (agent: AgentRecord) => void;
  onDelete: (agent: AgentRecord) => void;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-muted/50">
      <div className="flex items-start gap-3">
        <AgentAvatar name={agent.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-medium leading-snug">{agent.name}</h2>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-secondary">{agent.description}</p>
        </div>
      </div>

      <div className="mt-4 min-h-6">
        {agent.tools.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tools">
            {agent.tools.map((t) => {
              const { label, Icon } = TOOL_BY_ID[t];
              return (
                <li key={t} className="flex items-center gap-1.5 rounded-full border border-border bg-elevated py-0.5 pl-1.5 pr-2.5 text-xs text-secondary">
                  <Icon className="size-3.5" />
                  {label}
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="text-xs text-muted">No tools assigned</span>
        )}
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
        <Button variant="primary" size="sm" onClick={() => onOpenChat(agent)} className="flex-1 sm:flex-none">
          <MessageSquare className="size-3.5" /> Open chat
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Tooltip label="Edit">
            <Link
              href={`/agents/${agent.id}`}
              aria-label={`Edit ${agent.name}`}
              className="flex size-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-elevated hover:text-foreground"
            >
              <Pencil className="size-4" />
            </Link>
          </Tooltip>
          <Tooltip label="Delete">
            <button
              onClick={() => onDelete(agent)}
              aria-label={`Delete ${agent.name}`}
              className="flex size-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="size-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </article>
  );
}
