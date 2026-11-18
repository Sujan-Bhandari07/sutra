import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AgentList } from "@/components/agents/AgentList";
import { PageShell } from "@/components/layout/PageShell";
import { buttonVariants } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Explore agents" };

export default function AgentsPage() {
  return (
    <PageShell
      title="Explore agents"
      subtitle="Your custom agents"
      width="max-w-6xl"
      actions={
        <Link href="/agents/create" className={buttonVariants({ variant: "primary", size: "sm" })}>
          <Plus className="size-4" /> Create agent
        </Link>
      }
    >
      <AgentList />
    </PageShell>
  );
}
