import type { Metadata } from "next";
import { CreateAgentView } from "@/components/agents/CreateAgentView";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "Create agent" };

export default function CreateAgentPage() {
  return (
    <PageShell title="Create agent" subtitle="Give an agent a role, rules, and tools" width="max-w-2xl">
      <CreateAgentView />
    </PageShell>
  );
}
