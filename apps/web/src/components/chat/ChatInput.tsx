"use client";

import { useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, ImagePlus, Paperclip, Square } from "lucide-react";
import { AgentSelector } from "./AgentSelector";
import { AttachmentPreview } from "./AttachmentPreview";
import { DropOverlay, useFileDrop } from "./FileUpload";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAttachments } from "@/hooks/useAttachments";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

export function ChatInput() {
  const [text, setText] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const { attachments, add, remove, clear } = useAttachments();

  const replyPhase = useAppStore((s) => s.replyPhase);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const stopReply = useAppStore((s) => s.stopReply);
  const busy = replyPhase !== "idle";

  const { getRootProps, getInputProps, open, isDragActive } = useFileDrop({ onFiles: add });

  const canSend = !busy && (text.trim().length > 0 || attachments.length > 0);

  function submit() {
    if (!canSend) return;
    const message = text.trim();
    const files = attachments;
    setText("");
    clear();
    void sendMessage(message, files);
  }

  return (
    <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto w-full max-w-3xl">
        <div
          {...getRootProps()}
          className={cn(
            "relative rounded-2xl border border-border bg-surface transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15",
          )}
        >
          <input {...getInputProps()} aria-label="Attach files" />
          <DropOverlay active={isDragActive} />

          {attachments.length > 0 && (
            <ul className="flex flex-wrap gap-2.5 px-3.5 pt-3.5" aria-label="Attachments">
              {attachments.map((a) => (
                <li key={a.id}>
                  <AttachmentPreview attachment={a} onRemove={remove} />
                </li>
              ))}
            </ul>
          )}

          <TextareaAutosize
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files);
              if (files.length) {
                e.preventDefault();
                add(files);
              }
            }}
            minRows={1}
            maxRows={8}
            placeholder="Message Sutra"
            aria-label="Message"
            className="block w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted focus:outline-none"
          />

          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
            <div className="flex min-w-0 items-center gap-0.5">
              <input
                ref={imageInput}
                type="file"
                accept="image/jpeg,image/png,video/mp4"
                multiple
                hidden
                onChange={(e) => {
                  add(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
              <Tooltip label="Add image">
                <button
                  onClick={() => imageInput.current?.click()}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-foreground"
                  aria-label="Add image"
                >
                  <ImagePlus className="size-[18px]" />
                </button>
              </Tooltip>
              <Tooltip label="Attach file">
                <button
                  onClick={open}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-elevated hover:text-foreground"
                  aria-label="Attach file"
                >
                  <Paperclip className="size-[18px]" />
                </button>
              </Tooltip>
              <span className="mx-1.5 h-4 w-px bg-border" aria-hidden />
              <AgentSelector disabled={busy} />
            </div>

            {busy ? (
              <Tooltip label="Stop response">
                <button
                  onClick={stopReply}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90"
                  aria-label="Stop response"
                >
                  <Square className="size-3 fill-current" />
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={submit}
                disabled={!canSend}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-hover disabled:bg-elevated disabled:text-muted"
                aria-label="Send message"
              >
                <ArrowUp className="size-4" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted">Sutra streams agent responses. Images and MP4 videos are uploaded to your configured media host.</p>
      </div>
    </div>
  );
}
