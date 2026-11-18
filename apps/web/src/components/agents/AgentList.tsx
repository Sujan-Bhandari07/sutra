"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Bot, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { AgentCard } from "./AgentCard";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { AgentCardSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAppStore } from "@/store/app-store";
import type { AgentRecord } from "@/types";
import { cn } from "@/lib/utils";

export function AgentList() {
  const router = useRouter();
  const agents = useAppStore((s) => s.agents);
  const status = useAppStore((s) => s.agentsStatus);
  const loadAgents = useAppStore((s) => s.loadAgents);
  const deleteAgent = useAppStore((s) => s.deleteAgent);
  const newChat = useAppStore((s) => s.newChat);

  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<AgentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }, [agents, query]);

  const loading = status === "idle" || status === "loading";

  function openChat(agent: AgentRecord) {
    newChat(agent.id);
    router.push("/chat");
  }

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    try {
      await deleteAgent(pending.id);
      toast.success(`${pending.name} deleted`);
      setPending(null);
    } catch {
      toast.error("Couldn't delete the agent. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (status === "error") {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load your agents"
        description="Something went wrong while fetching your agents. Check your connection and try again."
        action={<Button variant="secondary" onClick={() => void loadAgents()}>Try again</Button>}
      />
    );
  }

  return (
    <div>
      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents"
          aria-label="Search agents"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Agents are assistants with their own instructions and tools. Create one to get started."
          action={
            <Link href="/agents/create" className={cn(buttonVariants({ variant: "primary" }))}>
              <Plus className="size-4" /> Create agent
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching agents"
          description={`Nothing matches "${query.trim()}". Try a different name or keyword.`}
          action={<Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onOpenChat={openChat} onDelete={setPending} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title="Delete this agent?"
        description={
          pending ? (
            <>
              <span className="font-medium text-foreground">{pending.name}</span> and its instructions will be removed.
              Past conversations stay in your history. This can't be undone.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Delete agent"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
