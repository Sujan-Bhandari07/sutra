/* ------------------------------------------------------------------ *
 * Backend-shaped data
 * ------------------------------------------------------------------ */

export type AgentTool = "instagram" | "gmail" | "googlecalendar";

/**
 * Mirrors the NestJS `Agent` schema. (`tools` is `string[]` on the server;
 * the frontend narrows it to the tools it knows how to render.)
 */
export interface Agent {
  name: string;
  description: string;
  instruction: string;
  userid: string;
  tools: AgentTool[];
}

/** An agent as returned by the API: the schema fields plus the document id. */
export interface AgentRecord extends Agent {
  id: string;
}

/** What the agent form collects. `userid` comes from the authenticated user. */
export type AgentInput = Omit<Agent, "userid">;

/* ------------------------------------------------------------------ *
 * Integrations
 * ------------------------------------------------------------------ */

export interface Integration {
  tool: AgentTool;
  connected: boolean;
  /** Account label shown once connected, e.g. an email or @handle. */
  account?: string;
  connectedAt?: string;
}

/* ------------------------------------------------------------------ *
 * Chat
 * ------------------------------------------------------------------ */

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  kind: "image" | "file";
  /** Object URL for local previews only. */
  previewUrl?: string;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  /** `null` means the built-in General agent. */
  agentId: string | null;
  updatedAt: string;
  messages: Message[];
}

/* ------------------------------------------------------------------ *
 * Session
 * ------------------------------------------------------------------ */

export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
}
