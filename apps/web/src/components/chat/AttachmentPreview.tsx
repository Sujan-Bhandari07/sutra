import { FileText, X } from "lucide-react";
import type { Attachment } from "@/types";
import { cn, formatBytes } from "@/lib/utils";

export function AttachmentPreview({
  attachment,
  onRemove,
  className,
}: {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  className?: string;
}) {
  const removeButton = onRemove && (
    <button
      type="button"
      onClick={() => onRemove(attachment.id)}
      aria-label={`Remove ${attachment.name}`}
      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-elevated text-secondary opacity-100 shadow transition-colors hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
    >
      <X className="size-3" />
    </button>
  );

  if (attachment.kind === "image" && attachment.previewUrl) {
    return (
      <div className={cn("group relative", className)}>
        {/* Local blob preview, so next/image optimisation doesn't apply. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className={cn("rounded-lg border border-border object-cover", onRemove ? "size-16" : "max-h-64 max-w-full")}
        />
        {removeButton}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex h-16 max-w-56 items-center gap-2.5 rounded-lg border border-border bg-elevated px-3",
        className,
      )}
    >
      <FileText className="size-5 shrink-0 text-secondary" />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{attachment.name}</span>
        <span className="block text-xs text-muted">{formatBytes(attachment.size)}</span>
      </span>
      {removeButton}
    </div>
  );
}
