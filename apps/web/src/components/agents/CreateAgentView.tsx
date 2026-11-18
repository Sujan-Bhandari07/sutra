"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AgentForm } from "./AgentForm";
import { useAppStore } from "@/store/app-store";

export function CreateAgentView() {
  const router = useRouter();
  const createAgent = useAppStore((s) => s.createAgent);

  return (
    <AgentForm
      submitLabel="Create agent"
      onCancel={() => router.push("/agents")}
      onSubmit={async (values) => {
        try {
          const agent = await createAgent(values);
          toast.success(`${agent.name} created`);
          router.push("/agents");
        } catch {
          toast.error("Couldn't create the agent. Check your connection and try again.");
        }
      }}
    />
  );
}
