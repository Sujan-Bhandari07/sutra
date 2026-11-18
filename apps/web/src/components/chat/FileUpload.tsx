"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Wraps react-dropzone: drop anywhere on the composer, or use the attach buttons. */
export function useFileDrop({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) {
        const tooLarge = rejected.some((r) => r.errors.some((e) => e.code === "file-too-large"));
        toast.error(tooLarge ? "Files must be 10 MB or smaller." : "Some files couldn't be added.");
      }
      if (accepted.length) onFiles(accepted);
    },
    [onFiles],
  );

  return useDropzone({ onDrop, noClick: true, noKeyboard: true, maxSize: MAX_FILE_SIZE, disabled });
}

export function DropOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-primary bg-surface/95 text-sm font-medium text-primary"
    >
      <ImagePlus className="size-4" /> Drop to attach
    </div>
  );
}
