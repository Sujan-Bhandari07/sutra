import type { Conversation } from "@/types";
import { MOCK_CONVERSATIONS } from "./mock-data";
import { sleep } from "@/lib/utils";

export async function listConversations(): Promise<Conversation[]> {
  await sleep(300);
  return MOCK_CONVERSATIONS.map((c) => ({ ...c, messages: [...c.messages] }));
}

export function titleFromMessage(text: string, hasAttachments: boolean) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return hasAttachments ? "Shared attachments" : "New chat";
  return clean.length > 48 ? `${clean.slice(0, 45).trimEnd()}...` : clean;
}
