import { TState } from "./state";

/** Approval is a deliberate stop point. Side-effect tools are never called here. */
const approval = async (state: TState): Promise<TState> => state;

export { approval };
