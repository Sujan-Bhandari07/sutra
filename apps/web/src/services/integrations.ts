import type { AgentTool, Integration } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const PROVIDER: Record<AgentTool, "google" | "instagram"> = {
  gmail: "google",
  googlecalendar: "google",
  instagram: "instagram",
};

export class IntegrationRequestError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "IntegrationRequestError";
  }
}

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new IntegrationRequestError("Sutra could not reach the integrations service.");
  }
  if (!response.ok) throw new IntegrationRequestError("The integrations service rejected the request.", response.status);
  try {
    return await response.json();
  } catch {
    throw new IntegrationRequestError("The integrations service returned an invalid response.", response.status);
  }
}

export async function listIntegrations(): Promise<Integration[]> {
  const result = await request("/integrations");
  const values = result?.payload?.integrations;
  if (!result || result.success !== true || !values || typeof values !== "object") {
    throw new IntegrationRequestError("The integrations service returned an unexpected response.");
  }
  return (["instagram", "gmail", "googlecalendar"] as AgentTool[]).map((tool) => {
    const item = values[tool === "googlecalendar" ? "googlecalender" : tool] ?? {};
    return {
      tool,
      connected: Boolean(item.connected),
      account: item.email ?? item.username ?? undefined,
      connectedAt: item.connectedAt ? new Date(item.connectedAt).toISOString() : undefined,
    };
  });
}

export async function connectIntegration(tool: AgentTool): Promise<Integration> {
  const url = getConnectUrl(tool);
  window.location.assign(url);
  return { tool, connected: false };
}

export function getConnectUrl(tool: AgentTool): string {
  const service = tool === "googlecalendar" ? "calendar" : tool === "gmail" ? "gmail" : null;
  const suffix = service ? `?service=${service}` : "";
  return `${API}/integrations/${PROVIDER[tool]}/connect${suffix}`;
}

export async function disconnectIntegration(tool: AgentTool): Promise<Integration> {
  const service = tool === "googlecalendar" ? "calendar" : tool === "gmail" ? "gmail" : null;
  await request(`/integrations/disconnect/${PROVIDER[tool]}${service ? `?service=${service}` : ""}`, { method: "POST" });
  return { tool, connected: false };
}
