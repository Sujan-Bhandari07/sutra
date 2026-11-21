export interface ApprovalRecord {
  id: string; conversationId: string; action: string; summary: string;
  input: Record<string, any>; preview?: { mediaUrl?: string; contentType?: string; filename?: string }; status: string; createdAt: string;
}
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function getApproval(id: string): Promise<ApprovalRecord | null> {
  const response = await fetch(`${API}/approvals`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Couldn't load the approval details");
  const result = await response.json();
  return (result.payload ?? []).find((item: ApprovalRecord) => item.id === id) ?? null;
}

export async function decideApproval(id: string, decision: "approved" | "rejected" | "cancelled", onStatus?: (status: string) => void) {
  const response = await fetch(`${API}/approvals/${encodeURIComponent(id)}/stream`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
  });
  if (!response.ok || !response.body) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message ?? "Couldn't update the approval");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: any;
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
      if (event === "status") onStatus?.(payload.status);
      if (event === "error") throw new Error(payload.message ?? "Approval update failed");
      if (event === "result") result = payload;
    }
    if (done) break;
  }
  if (!result) throw new Error("The approval stream ended without a result");
  return result.payload;
}
