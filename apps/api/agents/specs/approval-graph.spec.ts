import { describe, expect, it } from "vitest";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import { buildAgentGraph, Command } from "../src/app/agent/graph";
import { approvalMatchesCheckpoint } from "../src/app/agent/action-policy";
import type { AgentStateType } from "../src/app/agent/state";

function graphWithExecutionCounter(executions: { count: number }) {
  return buildAgentGraph({
    supervise: async () => ({ route: "gmail" }),
    specialize: async () => ({ operation: "gmail.send", parameters: { to: ["a@example.com"], subject: "Status", body: "Hello" }, response: "Ready to send." }),
    createApproval: async () => "approval-1",
    execute: async () => { executions.count += 1; return { status: "sent", messageId: "message-1" }; },
    respond: async (state) => ({ response: JSON.stringify(state.result) }),
  }, new MemorySaver());
}

const initial = {
  userid: "user-1", conversationid: "conversation-1", checkpointthreadid: "conversation-1:turn-1",
  turnid: "turn-1", streamid: "", timezone: "UTC", input: "Send an email", assetids: [],
  agentinstruction: "", agenttools: ["gmail"], history: [], route: "general", operation: "none",
  parameters: {}, response: "", approvalid: "", approved: false, result: {},
} satisfies AgentStateType;

describe("LangGraph approval interruption", () => {
  it("resumes at the checkpoint after explicit approval and executes once", async () => {
    const executions = { count: 0 };
    const graph = graphWithExecutionCounter(executions);
    const config = { configurable: { thread_id: "conversation-1:turn-1" } };
    const interrupted = await graph.invoke(initial, config);
    expect(interrupted.__interrupt__).toBeDefined();
    expect(executions.count).toBe(0);
    const saved = await graph.getState(config);
    expect(approvalMatchesCheckpoint(
      { id: "approval-1", action: "gmail.send", input: { to: ["a@example.com"], subject: "Status", body: "Hello" } },
      saved.values as { operation?: string; parameters?: Record<string, unknown>; approvalid?: string },
    )).toBe(true);

    const completed = await graph.invoke(new Command({ resume: { approved: true } }), config);
    expect(executions.count).toBe(1);
    expect(completed.result.status).toBe("sent");
  });

  it("does not execute after rejection", async () => {
    const executions = { count: 0 };
    const graph = graphWithExecutionCounter(executions);
    const config = { configurable: { thread_id: "conversation-1:turn-2" } };
    await graph.invoke({ ...initial, checkpointthreadid: "conversation-1:turn-2", turnid: "turn-2" }, config);
    const rejected = await graph.invoke(new Command({ resume: { approved: false } }), config);
    expect(executions.count).toBe(0);
    expect(rejected.response).toContain("not approved");
  });

  it("executes read-only calendar actions without requesting approval", async () => {
    const executions = { count: 0 };
    const approvals = { count: 0 };
    const graph = buildAgentGraph({
      supervise: async () => ({ route: "calendar" }),
      specialize: async () => ({ operation: "calendar.list", parameters: { timeMin: "2030-01-01T00:00:00Z" }, response: "Checking your calendar." }),
      createApproval: async () => { approvals.count += 1; return "approval-read"; },
      execute: async () => { executions.count += 1; return { events: [] }; },
      respond: async () => ({ response: "No events found." }),
    }, new MemorySaver());
    const output = await graph.invoke({ ...initial, checkpointthreadid: "conversation-1:turn-3", turnid: "turn-3" }, { configurable: { thread_id: "conversation-1:turn-3" } });
    expect(output.__interrupt__).toBeUndefined();
    expect(approvals.count).toBe(0);
    expect(executions.count).toBe(1);
  });
});
