import type { AgentTool, Integration } from "@/types";
import { MOCK_ACCOUNT_LABELS, MOCK_INTEGRATIONS } from "./mock-data";
import { sleep } from "@/lib/utils";

// Simulated connection state. No OAuth happens here. When the backend exists,
// `connectIntegration` should redirect to the provider's consent screen.
let integrations: Integration[] = MOCK_INTEGRATIONS.map((i) => ({ ...i }));

export async function listIntegrations(): Promise<Integration[]> {
  await sleep(450);
  return integrations.map((i) => ({ ...i }));
}

export async function connectIntegration(tool: AgentTool): Promise<Integration> {
  await sleep(900);
  const next: Integration = {
    tool,
    connected: true,
    account: MOCK_ACCOUNT_LABELS[tool],
    connectedAt: new Date().toISOString(),
  };
  integrations = integrations.map((i) => (i.tool === tool ? next : i));
  return next;
}

export async function disconnectIntegration(tool: AgentTool): Promise<Integration> {
  await sleep(600);
  const next: Integration = { tool, connected: false };
  integrations = integrations.map((i) => (i.tool === tool ? next : i));
  return next;
}
