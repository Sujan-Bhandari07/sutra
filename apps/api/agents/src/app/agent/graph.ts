import { Command, END, interrupt, START, StateGraph, type BaseCheckpointSaver } from "@langchain/langgraph";
import { AgentState, type AgentStateType } from "./state";
import { MUTATING_ACTIONS } from "./action-policy";

export interface AgentGraphDependencies {
  supervise(state: AgentStateType): Promise<Partial<AgentStateType>>;
  specialize(state: AgentStateType): Promise<Partial<AgentStateType>>;
  prepare?(state: AgentStateType): Promise<Partial<AgentStateType>>;
  createApproval(state: AgentStateType): Promise<string>;
  execute(state: AgentStateType): Promise<Record<string, unknown>>;
  respond(state: AgentStateType): Promise<Partial<AgentStateType>>;
}

export function buildAgentGraph(dependencies: AgentGraphDependencies, checkpointer: BaseCheckpointSaver) {
  return new StateGraph(AgentState)
    .addNode("supervisor", (state) => dependencies.supervise(state))
    .addNode("specialist", async (state) => {
      const planned = await dependencies.specialize(state);
      return dependencies.prepare ? dependencies.prepare({ ...state, ...planned } as AgentStateType) : planned;
    })
    .addNode("approval", async (state) => {
      const approvalid = await dependencies.createApproval(state);
      const decision = interrupt({
        kind: "approval_required",
        approvalid,
        route: state.route,
        operation: state.operation,
        summary: state.response,
        parameters: state.parameters,
      }) as { approved?: boolean };
      return {
        approvalid,
        approved: decision?.approved === true,
        response: decision?.approved === true ? "Approved. Executing the action now." : "This action was not approved.",
      };
    })
    .addNode("execute", async (state) => ({ result: await dependencies.execute(state) }))
    .addNode("respond", (state) => dependencies.respond(state))
    .addEdge(START, "supervisor")
    .addEdge("supervisor", "specialist")
    .addConditionalEdges("specialist", (state) => {
      if (state.operation === "none") return "respond";
      return MUTATING_ACTIONS.has(state.operation) ? "approval" : "execute";
    })
    .addConditionalEdges("approval", (state) => state.approved ? "execute" : END)
    .addEdge("execute", "respond")
    .addEdge("respond", END)
    .compile({ checkpointer });
}

export { Command };
