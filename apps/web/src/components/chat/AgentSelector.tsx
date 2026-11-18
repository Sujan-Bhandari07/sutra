"use client";

import Link from "next/link";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/Dropdown";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { GENERAL_AGENT } from "@/lib/tools";
import { useAppStore } from "@/store/app-store";

export function AgentSelector({ disabled }: { disabled?: boolean }) {
  const agents = useAppStore((s) => s.agents);
  const selectedId = useAppStore((s) => s.selectedAgentId);
  const setSelected = useAppStore((s) => s.setSelectedAgent);

  const selectedCustom = agents.find((a) => a.id === selectedId);
  const current = selectedCustom
    ? { id: selectedCustom.id, name: selectedCustom.name, general: false }
    : { id: GENERAL_AGENT.id, name: GENERAL_AGENT.name, general: true };

  const options = [
    { id: GENERAL_AGENT.id, name: GENERAL_AGENT.name, description: GENERAL_AGENT.description, general: true },
    ...agents.map((a) => ({ id: a.id, name: a.name, description: a.description, general: false })),
  ];

  return (
    <Dropdown>
      <DropdownTrigger asChild disabled={disabled}>
        <button
          className="flex h-8 max-w-48 items-center gap-2 rounded-lg px-2 text-[13px] text-secondary transition-colors hover:bg-elevated hover:text-foreground data-[state=open]:bg-elevated data-[state=open]:text-foreground disabled:opacity-50"
          aria-label={`Agent: ${current.name}. Change agent`}
        >
          <AgentAvatar name={current.name} general={current.general} size="sm" />
          <span className="truncate">{current.name}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted" />
        </button>
      </DropdownTrigger>
      <DropdownContent side="top" align="start" className="w-[min(20rem,calc(100vw-2rem))] p-1.5">
        <div className="max-h-72 overflow-y-auto">
          {options.map((o) => (
            <DropdownItem key={o.id} onSelect={() => setSelected(o.id)} className="items-start gap-3 py-2">
              <AgentAvatar name={o.name} general={o.general} size="md" className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{o.name}</span>
                <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">{o.description}</span>
              </span>
              {o.id === current.id && <Check className="mt-1 size-4 shrink-0 text-primary" />}
            </DropdownItem>
          ))}
        </div>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/agents/create">
            <Plus className="size-4" /> Create an agent
          </Link>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
