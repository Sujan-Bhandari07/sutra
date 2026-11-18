"use client";

import { memo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { CodeBlock } from "./CodeBlock";
import { AttachmentPreview } from "./AttachmentPreview";
import { LogoMark } from "@/components/ui/Logo";
import type { Message } from "@/types";

const markdownComponents: Components = {
  pre: ({ children }) => <>{children}</>,
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const text = String(children).replace(/\n$/, "");
    if (match || text.includes("\n")) return <CodeBlock code={text} language={match?.[1]} />;
    return <code>{children}</code>;
  },
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

function AssistantAvatar() {
  return (
    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-primary">
      <LogoMark className="size-4" />
    </span>
  );
}

export const TypingIndicator = () => (
  <div className="flex gap-3" role="status" aria-label="Sutra is typing">
    <AssistantAvatar />
    <div className="flex h-7 items-center gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot size-1.5 rounded-full bg-secondary" style={{ animationDelay: `${i * 0.16}s` }} />
      ))}
    </div>
  </div>
);

function CopyMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error("Couldn't copy the message.");
        }
      }}
      className="rounded-md p-1 text-muted opacity-0 transition hover:text-foreground focus-visible:opacity-100 group-hover/msg:opacity-100"
      aria-label={copied ? "Copied" : "Copy message"}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function ChatMessageBase({ message }: { message: Message }) {
  const time = format(new Date(message.createdAt), "h:mm a");

  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-2">
            {message.attachments.map((a) => (
              <AttachmentPreview key={a.id} attachment={a} />
            ))}
          </div>
        )}
        {message.content && (
          <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-elevated px-4 py-2.5 text-[15px] leading-relaxed">
            {message.content}
          </div>
        )}
        <time dateTime={message.createdAt} className="px-1 text-xs text-muted">
          {time}
        </time>
      </div>
    );
  }

  return (
    <div className="group/msg flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1">
        <div className="prose-sutra">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <time dateTime={message.createdAt} className="text-xs text-muted">
            {time}
          </time>
          <CopyMessage text={message.content} />
        </div>
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageBase, (a, b) => a.message.content === b.message.content && a.message.id === b.message.id);
