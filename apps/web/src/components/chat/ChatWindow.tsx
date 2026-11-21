"use client";

import { useEffect, useMemo, useRef } from "react";
import { Code2, ListChecks, PenLine, Scale } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ChatInput } from "./ChatInput";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import { LogoMark } from "@/components/ui/Logo";
import { GENERAL_AGENT } from "@/lib/tools";
import { useAppStore } from "@/store/app-store";

const STARTERS = [
  { icon: ListChecks, label: "Plan a launch week as a table", prompt: "Compare a three-day and a five-day launch plan in a table." },
  { icon: Code2, label: "Write a TypeScript helper", prompt: "Write a small TypeScript function that groups items by a key." },
  { icon: PenLine, label: "Draft a short announcement", prompt: "Draft a short announcement for a new scheduling feature." },
  { icon: Scale, label: "Compare two approaches", prompt: "Help me compare two ways to structure a team's weekly planning." },
];

export function ChatWindow() {
  const conversations = useAppStore((s) => s.conversations);
  const activeId = useAppStore((s) => s.activeConversationId);
  const agents = useAppStore((s) => s.agents);
  const selectedAgentId = useAppStore((s) => s.selectedAgentId);
  const replyPhase = useAppStore((s) => s.replyPhase);
  const busyId = useAppStore((s) => s.busyConversationId);
  const executionStatus = useAppStore((s) => s.executionStatus);
  const sendMessage = useAppStore((s) => s.sendMessage);

  const conversation = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);
  const agent = agents.find((a) => a.id === selectedAgentId) ?? null;
  const messages = conversation?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const showTyping = replyPhase === "thinking" && busyId === activeId;

  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    stickToBottom.current = true;
  }, [activeId]);

  useEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [activeId, messages.length, lastMessage?.content, showTyping]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader
        title={conversation?.title ?? "New chat"}
        subtitle={agent ? agent.name : GENERAL_AGENT.name}
      />

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
            <span className="mb-5 flex size-12 items-center justify-center rounded-xl border border-border bg-surface text-primary">
              <LogoMark className="size-7" />
            </span>
            <h2 className="text-balance text-2xl font-semibold tracking-tight">What should we work on?</h2>
            <p className="mt-3 max-w-md text-pretty text-sm text-secondary">
              {agent ? (
                <>
                  Chatting with <span className="font-medium text-foreground">{agent.name}</span>. {agent.description}
                </>
              ) : (
                GENERAL_AGENT.description
              )}
            </p>
            <ul className="mt-9 grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {STARTERS.map(({ icon: Icon, label, prompt }) => (
                <li key={label}>
                  <button
                    onClick={() => void sendMessage(prompt, [])}
                    className="flex h-full w-full items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm text-secondary transition-colors hover:border-muted/50 hover:bg-elevated hover:text-foreground"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[51rem] flex-col gap-7 px-4 py-8 sm:px-6" aria-live="polite">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {showTyping && <TypingIndicator status={executionStatus ?? undefined} />}
          </div>
        )}
      </div>

      <ChatInput />
    </div>
  );
}
