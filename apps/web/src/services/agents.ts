import type { AgentInput, AgentRecord } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
type ApiAgent = Omit<AgentRecord, "id"> & { _id?: string; id?: string };

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`Agent request failed (${response.status}).`);
  return response.json();
}

function normalize(agent: ApiAgent): AgentRecord {
  const { _id, ...fields } = agent;
  return { ...fields, id: agent.id ?? _id ?? "" } as AgentRecord;
}

export async function listAgents(): Promise<AgentRecord[]> {
  const result = await request("/agents/getagents");
  return (result.payload ?? []).map(normalize);
}

export async function getAgent(id: string): Promise<AgentRecord | null> {
  return (await listAgents()).find((agent) => agent.id === id) ?? null;
}

export async function createAgent(input: AgentInput): Promise<AgentRecord> {
  const result = await request("/agents/createagent", { method: "POST", body: JSON.stringify(input) });
  return normalize(result.payload);
}

export async function updateAgent(id: string, input: AgentInput): Promise<AgentRecord> {
  const result = await request(`/agents/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
  return normalize(result.payload);
}

export async function deleteAgent(id: string): Promise<void> {
  await request(`/agents/${encodeURIComponent(id)}`, { method: "DELETE" });
}
