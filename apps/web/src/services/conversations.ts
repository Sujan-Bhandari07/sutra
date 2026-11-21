import type { Conversation, Message } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function mapConversation(raw: any): Conversation {
  return {
    id: String(raw._id ?? raw.id),
    title: raw.title ?? "New chat",
    agentId: raw.agentid ?? null,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    messages: (raw.messages ?? []).map((message: any): Message => ({
      id: String(message._id ?? message.id), role: message.role, content: message.content,
      createdAt: message.createdAt ?? raw.updatedAt ?? new Date().toISOString(),
      metadata: message.metadata,
      attachments: (message.metadata?.attachments ?? []).map((item: any) => ({
        id: item.assetId, name: item.filename, size: item.size ?? 0, mimeType: item.contentType,
        kind: item.contentType === "video/mp4" ? "video" : "image", previewUrl: item.url,
      })),
    })),
  };
}

export async function listConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API}/conversations`, { credentials: "include", cache: "no-store" });
  if (response.status === 401) return [];
  if (!response.ok) throw new Error("Couldn't load conversation history");
  const result = await response.json();
  return (result.payload ?? []).map(mapConversation);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const response = await fetch(`${API}/conversations/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Couldn't load this conversation");
  return mapConversation((await response.json()).payload);
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${API}/conversations/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
  if (!response.ok) throw new Error("Couldn't delete this conversation");
}

export function titleFromMessage(text: string, hasAttachments: boolean) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return hasAttachments ? "Shared attachments" : "New chat";
  return clean.length > 48 ? `${clean.slice(0, 45).trimEnd()}...` : clean;
}
