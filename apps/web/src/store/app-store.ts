"use client";

import { create } from "zustand";
import type {
  AgentInput,
  AgentRecord,
  AgentTool,
  Attachment,
  Conversation,
  Integration,
  Message,
  User,
} from "@/types";
import * as agentsService from "@/services/agents";
import * as authService from "@/services/auth";
import * as conversationsService from "@/services/conversations";
import * as integrationsService from "@/services/integrations";
import { streamReply } from "@/services/messages";
import { GENERAL_AGENT } from "@/lib/tools";
import { uid } from "@/lib/utils";

export type ThemePreference = "dark" | "light" | "system";

interface AppState {
  user: User | null;
  agents: AgentRecord[];
  agentsStatus: "idle" | "loading" | "ready" | "error";
  integrations: Integration[];
  integrationsStatus: "idle" | "loading" | "ready" | "error";
  conversations: Conversation[];
  activeConversationId: string | null;
  selectedAgentId: string;
  /** Conversation currently waiting on or receiving a reply. */
  busyConversationId: string | null;
  replyPhase: "idle" | "thinking" | "streaming";
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  theme: ThemePreference;

  init: () => Promise<void>;
  loadAgents: () => Promise<void>;
  loadIntegrations: () => Promise<void>;

  setSidebarCollapsed: (v: boolean) => void;
  setMobileNavOpen: (v: boolean) => void;
  setTheme: (t: ThemePreference) => void;

  newChat: (agentId?: string) => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  setSelectedAgent: (id: string) => void;
  sendMessage: (text: string, attachments: Attachment[]) => Promise<void>;
  stopReply: () => void;

  createAgent: (input: AgentInput) => Promise<AgentRecord>;
  updateAgent: (id: string, input: AgentInput) => Promise<AgentRecord>;
  deleteAgent: (id: string) => Promise<void>;

  connectIntegration: (tool: AgentTool) => Promise<void>;
  disconnectIntegration: (tool: AgentTool) => Promise<void>;
}

let abortSignal = { aborted: false };
let initPromise: Promise<void> | null = null;

function applyTheme(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  const resolved =
    theme === "system" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : theme;
  document.documentElement.dataset.theme = resolved;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  agents: [],
  agentsStatus: "idle",
  integrations: [],
  integrationsStatus: "idle",
  conversations: [],
  activeConversationId: null,
  selectedAgentId: GENERAL_AGENT.id,
  busyConversationId: null,
  replyPhase: "idle",
  sidebarCollapsed: false,
  mobileNavOpen: false,
  theme: "dark",

  init: () => {
    if (!initPromise) {
      initPromise = (async () => {
        const stored = (typeof localStorage !== "undefined" && (localStorage.getItem("sutra-theme") as ThemePreference | null)) || "dark";
        set({ theme: stored });
        const [user, conversations] = await Promise.all([
          authService.getCurrentUser(),
          conversationsService.listConversations(),
        ]);
        set({ user, conversations });
        await Promise.all([get().loadAgents(), get().loadIntegrations()]);
      })();
    }
    return initPromise;
  },

  loadAgents: async () => {
    set({ agentsStatus: "loading" });
    try {
      set({ agents: await agentsService.listAgents(), agentsStatus: "ready" });
    } catch {
      set({ agentsStatus: "error" });
    }
  },

  loadIntegrations: async () => {
    set({ integrationsStatus: "loading" });
    try {
      set({ integrations: await integrationsService.listIntegrations(), integrationsStatus: "ready" });
    } catch {
      set({ integrationsStatus: "error" });
    }
  },

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  setTheme: (theme) => {
    try {
      localStorage.setItem("sutra-theme", theme);
    } catch {
      /* storage unavailable: preference lasts for this session only */
    }
    applyTheme(theme);
    set({ theme });
  },

  newChat: (agentId) => {
    get().stopReply();
    set({
      activeConversationId: null,
      selectedAgentId: agentId ?? get().selectedAgentId,
    });
  },

  selectConversation: (id) => {
    get().stopReply();
    const convo = get().conversations.find((c) => c.id === id);
    set({
      activeConversationId: id,
      selectedAgentId: convo?.agentId && get().agents.some((a) => a.id === convo.agentId) ? convo.agentId : GENERAL_AGENT.id,
    });
  },

  deleteConversation: (id) => {
    if (get().activeConversationId === id) get().stopReply();
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      activeConversationId: s.activeConversationId === id ? null : s.activeConversationId,
    }));
  },

  setSelectedAgent: (id) => set({ selectedAgentId: id }),

  sendMessage: async (text, attachments) => {
    const state = get();
    if (state.replyPhase !== "idle") return;

    const agentId = state.selectedAgentId === GENERAL_AGENT.id ? null : state.selectedAgentId;
    const agent = agentId ? state.agents.find((a) => a.id === agentId) ?? null : null;
    const now = new Date().toISOString();

    const userMessage: Message = {
      id: uid("msg"),
      role: "user",
      content: text,
      createdAt: now,
      attachments: attachments.length ? attachments : undefined,
    };

    let convoId = state.activeConversationId;
    if (!convoId) {
      convoId = uid("conv");
      const convo: Conversation = {
        id: convoId,
        title: conversationsService.titleFromMessage(text, attachments.length > 0),
        agentId,
        updatedAt: now,
        messages: [userMessage],
      };
      set((s) => ({ conversations: [convo, ...s.conversations], activeConversationId: convoId }));
    } else {
      const id = convoId;
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, agentId, updatedAt: now, messages: [...c.messages, userMessage] } : c,
        ),
      }));
    }

    const targetId = convoId;
    abortSignal = { aborted: false };
    const signal = abortSignal;
    set({ busyConversationId: targetId, replyPhase: "thinking" });

    const replyId = uid("msg");
    const update = (content: string, first: boolean) =>
      set((s) => ({
        conversations: s.conversations.map((c) => {
          if (c.id !== targetId) return c;
          const reply: Message = { id: replyId, role: "assistant", content, createdAt: new Date().toISOString() };
          const messages = first ? [...c.messages, reply] : c.messages.map((m) => (m.id === replyId ? { ...m, content } : m));
          return { ...c, messages, updatedAt: new Date().toISOString() };
        }),
      }));

    try {
      let first = true;
      for await (const chunk of streamReply(
        { text, attachments, agent, integrations: get().integrations },
        signal,
      )) {
        if (signal.aborted) break;
        update(chunk, first);
        if (first) set({ replyPhase: "streaming" });
        first = false;
      }
    } finally {
      if (abortSignal === signal) set({ busyConversationId: null, replyPhase: "idle" });
    }
  },

  stopReply: () => {
    abortSignal.aborted = true;
    set({ busyConversationId: null, replyPhase: "idle" });
  },

  createAgent: async (input) => {
    const agent = await agentsService.createAgent(input);
    set((s) => ({ agents: [agent, ...s.agents] }));
    return agent;
  },

  updateAgent: async (id, input) => {
    const agent = await agentsService.updateAgent(id, input);
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? agent : a)) }));
    return agent;
  },

  deleteAgent: async (id) => {
    await agentsService.deleteAgent(id);
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== id),
      selectedAgentId: s.selectedAgentId === id ? GENERAL_AGENT.id : s.selectedAgentId,
    }));
  },

  connectIntegration: async (tool) => {
    const next = await integrationsService.connectIntegration(tool);
    set((s) => ({ integrations: s.integrations.map((i) => (i.tool === tool ? next : i)) }));
  },

  disconnectIntegration: async (tool) => {
    const next = await integrationsService.disconnectIntegration(tool);
    set((s) => ({ integrations: s.integrations.map((i) => (i.tool === tool ? next : i)) }));
  },
}));
