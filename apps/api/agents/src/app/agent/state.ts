import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
type TState = typeof state.State;


const state = Annotation.Root({
  ...MessagesAnnotation.spec,

  prompt: Annotation<string>(),
  response: Annotation<string>(),
  category:Annotation<string>()
});

export { TState };
