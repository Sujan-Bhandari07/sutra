import type { Metadata } from "next";
import { EditAgentView } from "@/components/agents/EditAgentView";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "Edit agent" };

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell title="Edit agent" subtitle="Update this agent's role, rules, and tools" width="max-w-2xl">
      <EditAgentView id={id} />
    </PageShell>
  );
}
