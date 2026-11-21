"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Attachment } from "@/types";
import { uid } from "@/lib/utils";

export const MAX_ATTACHMENTS = 6;

/** Holds composer attachments as local previews. Nothing is uploaded anywhere. */
export function useAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const ref = useRef<Attachment[]>([]);
  useEffect(() => {
    ref.current = attachments;
  }, [attachments]);

  const add = useCallback((files: File[]) => {
    const room = MAX_ATTACHMENTS - ref.current.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      return;
    }
    if (files.length > room) toast.error(`Only the first ${room} files were added (limit ${MAX_ATTACHMENTS}).`);
    const next: Attachment[] = files.slice(0, room).map((file) => {
      const isImage = file.type.startsWith("image/");
      return {
        id: uid("att"),
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        kind: isImage ? "image" : file.type === "video/mp4" ? "video" : "file",
        previewUrl: isImage || file.type === "video/mp4" ? URL.createObjectURL(file) : undefined,
        file,
      };
    });
    setAttachments((prev) => [...prev, ...next]);
  }, []);

  const remove = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  /** Clears the composer but keeps the object URLs alive: sent messages still show them. */
  const clear = useCallback(() => setAttachments([]), []);

  useEffect(
    () => () => {
      // Intentionally not revoking on unmount: sent messages may still reference these URLs.
    },
    [],
  );

  return { attachments, add, remove, clear };
}
