import type { TState } from "./state";

/** Compatibility export: routing and planning are executed by the compiled supervisor graph. */
export const routerAgent = async (state: TState) => ({ route: state.route });
