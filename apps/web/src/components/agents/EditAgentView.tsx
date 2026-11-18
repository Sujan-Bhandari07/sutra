"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { AgentForm } from "./AgentForm";
import { buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAppStore } from "@/store/app-store";

export function EditAgentView({ id }: { id: string }) {
  const router = useRouter();
  const agent = useAppStore((s) => s.agents.find((a) => a.id === id));
  const status = useAppStore((s) => s.agentsStatus);
  const updateAgent = useAppStore((s) => s.updateAgent);

  if (status === "idle" || status === "loading") {
    return (
      <div className="space-y-7" aria-busy>
        <LoadingSkeleton className="h-10 w-full" />
        <LoadingSkeleton className="h-10 w-full" />
        <LoadingSkeleton className="h-48 w-full" />
        <LoadingSkeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!agent) {
    return (
      <EmptyState
        icon={Bot}
        title="Agent not found"
        description="This agent may have been deleted. Head back to your agents to pick another."
        action={
          <Link href="/agents" className={buttonVariants({ variant: "secondary" })}>
            Back to agents
          </Link>
        }
      />
    );
  }

  return (
    <AgentForm
      defaultValues={{
        name: agent.name,
        description: agent.description,
        instruction: agent.instruction,
        tools: agent.tools,
      }}
      submitLabel="Save changes"
      onCancel={() => router.push("/agents")}
      onSubmit={async (values) => {
        try {
          await updateAgent(agent.id, values);
          toast.success(`${values.name} saved`);
          router.push("/agents");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't save changes. Try again.");
        }
      }}
    />
  );
}
