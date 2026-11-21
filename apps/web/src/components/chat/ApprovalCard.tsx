"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Clock3, X } from "lucide-react";
import { getApproval, decideApproval, type ApprovalRecord } from "@/services/approvals";
import { getConversation } from "@/services/conversations";
import { useAppStore } from "@/store/app-store";

export function ApprovalCard({ id }: { id: string }) {
  const refreshConversation = useAppStore((state) => state.refreshConversation);
  const [approval, setApproval] = useState<ApprovalRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [executionStatus, setExecutionStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try {
        const latest = await getApproval(id);
        if (!active || !latest) return;
        setApproval(latest);
        if (latest.status === "pending") timer = setTimeout(() => void refresh(), 5000);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Couldn't load the approval"); }
    };
    void refresh();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [id]);
  async function decide(decision: "approved" | "rejected" | "cancelled") {
    setBusy(true); setError("");
    try {
      const result = await decideApproval(id, decision, setExecutionStatus);
      setApproval((current) => current ? { ...current, status: result.approval?.status ?? decision } : current);
      const conversationId = approval?.conversationId;
      if (conversationId) { const conversation = await getConversation(conversationId); if (conversation) refreshConversation(conversation); }
    }
    catch (e) { setError(e instanceof Error ? e.message : "Approval update failed"); }
    finally { setBusy(false); }
  }
  return (
    <section className="mt-3 max-w-xl rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4" aria-label="Action approval">
      <div className="flex items-center gap-2 text-sm font-medium"><Clock3 className="size-4 text-amber-300" /> Review this action</div>
      <p className="mt-2 text-sm">{approval?.summary ?? "Loading action details…"}</p>
      {approval && <div className="mt-3 rounded-lg bg-background/60 p-3 text-sm leading-6 text-secondary">
        {approval.action.startsWith("gmail.") && <div className="space-y-2">
          <p><b>To:</b> {Array.isArray(approval.input.to) ? approval.input.to.join(", ") : String(approval.input.to ?? "From selected thread")}</p>
          {Array.isArray(approval.input.cc) && approval.input.cc.length > 0 && <p><b>CC:</b> {approval.input.cc.join(", ")}</p>}
          {Array.isArray(approval.input.bcc) && approval.input.bcc.length > 0 && <p><b>BCC:</b> {approval.input.bcc.join(", ")}</p>}
          <p><b>Subject:</b> {String(approval.input.subject ?? "(no subject)")}</p>
          <div className="whitespace-pre-wrap rounded-md border border-border p-3 text-foreground">{String(approval.input.body ?? "")}</div>
        </div>}
        {approval.action.startsWith("calendar.") && <div className="space-y-1">
          <p><b>Event:</b> {String(approval.input.summary ?? approval.input.eventId ?? "Calendar event")}</p>
          {approval.input.start && <p><b>Starts:</b> {String(approval.input.start.dateTime)} ({String(approval.input.start.timeZone ?? "time zone not set")})</p>}
          {approval.input.end && <p><b>Ends:</b> {String(approval.input.end.dateTime)}</p>}
          {Array.isArray(approval.input.attendees) && approval.input.attendees.length > 0 && <p><b>Attendees:</b> {approval.input.attendees.join(", ")}</p>}
          {approval.action === "calendar.update" && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(approval.input, null, 2)}</pre>}
        </div>}
        {approval.action === "instagram.publish" && <div className="space-y-3">
          {approval.preview?.mediaUrl && (approval.preview.contentType === "video/mp4"
            ? <video controls preload="metadata" src={approval.preview.mediaUrl} className="max-h-80 w-full rounded-lg object-contain">
                <track kind="captions" src="data:text/vtt,WEBVTT%0A%0A" srcLang="en" label="Captions" />
              </video>
            : <Image src={approval.preview.mediaUrl} alt={approval.preview.filename ?? "Selected Instagram media"} width={720} height={405} unoptimized className="max-h-80 w-full rounded-lg object-contain" />)}
          <p className="whitespace-pre-wrap rounded-md border border-border p-3 text-foreground">{String(approval.input.caption ?? "")}</p>
        </div>}
        {!approval.action.startsWith("gmail.") && !approval.action.startsWith("calendar.") && approval.action !== "instagram.publish" && <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(approval.input, null, 2)}</pre>}
      </div>}
      {approval?.status === "pending" && <p className="mt-2 text-xs text-muted">Want to change something? Send an edit in chat. This preview will be cancelled and a new one will need approval.</p>}
      {approval?.status === "pending" && <div className="mt-3 flex gap-2">
        <button disabled={busy} onClick={() => void decide("approved")} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-on-primary disabled:opacity-50"><Check className="size-3.5" /> Approve and run</button>
        <button disabled={busy} onClick={() => void decide("rejected")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-50"><X className="size-3.5" /> Reject</button>
        <button disabled={busy} onClick={() => void decide("cancelled")} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-50">Cancel</button>
      </div>}
      {busy && executionStatus && <output className="mt-3 block text-xs text-secondary">{executionStatus}</output>}
      {approval && approval.status !== "pending" && <p className="mt-3 text-xs text-secondary">Status: {approval.status}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </section>
  );
}
