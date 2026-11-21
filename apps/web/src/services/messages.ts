const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export interface ChatStreamInput { text: string; conversationId?: string | null; agentId?: string | null; assetIds?: string[]; turnId: string; timeZone?: string }
export interface ChatStreamResult {
  conversationId: string;
  message: string;
  result?: Record<string, unknown>;
  approval?: { id: string; conversationId: string; action: string; summary: string; input: Record<string, unknown>; status: string };
}

export async function streamChat(input: ChatStreamInput, onStatus: (status: string) => void, onToken: (text: string) => void, signal: AbortSignal, onReset?: () => void): Promise<ChatStreamResult> {
  const response = await fetch(`${API}/chat/stream`, {
    method: "POST", credentials: "include", signal,
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ text: input.text, conversationId: input.conversationId ?? undefined, agentId: input.agentId ?? undefined, assetIds: input.assetIds, turnId: input.turnId, timeZone: input.timeZone }),
  });
  if (!response.ok || !response.body) throw new Error(`Chat request failed (${response.status})`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ChatStreamResult | undefined;
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const event = frame.split("\n").find((line) => line.startsWith("event: "))?.slice(7);
      const data = frame.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
      if (!event || !data) continue;
      const payload = JSON.parse(data);
      if (event === "status") onStatus(payload.status);
      if (event === "token") onToken(payload.text ?? "");
      if (event === "reset") onReset?.();
      if (event === "error") throw new Error(payload.message ?? "Chat request failed");
      if (event === "result") result = payload;
    }
    if (done) break;
  }
  if (!result) throw new Error("The chat stream ended without a response");
  return result;
}
