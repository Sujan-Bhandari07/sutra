import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  userid: Annotation<string>(),
  conversationid: Annotation<string>(),
  checkpointthreadid: Annotation<string>(),
  turnid: Annotation<string>(),
  streamid: Annotation<string>(),
  timezone: Annotation<string>(),
  input: Annotation<string>(),
  assetids: Annotation<string[]>(),
  agentinstruction: Annotation<string>(),
  agenttools: Annotation<string[]>(),
  history: Annotation<Array<{ role: string; content: string; toolResult?: unknown; pendingAction?: unknown }>>(),
  route: Annotation<string>(),
  operation: Annotation<string>(),
  parameters: Annotation<Record<string, unknown>>(),
  response: Annotation<string>(),
  approvalid: Annotation<string>(),
  approved: Annotation<boolean>(),
  result: Annotation<Record<string, unknown>>(),
});

export type AgentStateType = typeof AgentState.State;
export type TState = AgentStateType;
