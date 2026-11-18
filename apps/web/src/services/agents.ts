import type { AgentInput, AgentRecord } from "@/types";
import { MOCK_AGENTS, MOCK_USER } from "./mock-data";
import { sleep, uid } from "@/lib/utils";

// In-memory store. Swap each function body for a fetch to the NestJS API later.
let agents: AgentRecord[] = [...MOCK_AGENTS];

export async function listAgents(): Promise<AgentRecord[]> {
  await sleep(500);
  return [...agents];
}

export async function getAgent(id: string): Promise<AgentRecord | null> {
  await sleep(300);
  return agents.find((a) => a.id === id) ?? null;
}

export async function createAgent(input: AgentInput): Promise<AgentRecord> {
  await sleep(700);
  // `userid` is filled from the authenticated user, never from the form.
  const agent: AgentRecord = { ...input, id: uid("agent"), userid: MOCK_USER.id };
  agents = [agent, ...agents];
  return agent;
}

export async function updateAgent(id: string, input: AgentInput): Promise<AgentRecord> {
  await sleep(600);
  const existing = agents.find((a) => a.id === id);
  if (!existing) throw new Error("This agent no longer exists.");
  const updated: AgentRecord = { ...existing, ...input };
  agents = agents.map((a) => (a.id === id ? updated : a));
  return updated;
}

export async function deleteAgent(id: string): Promise<void> {
  await sleep(500);
  agents = agents.filter((a) => a.id !== id);
}
