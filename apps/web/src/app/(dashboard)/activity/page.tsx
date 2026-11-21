"use client";

import { useEffect, useState } from "react";
import { Activity as ActivityIcon, AlertCircle } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { listActivity, type ActivityRecord } from "@/services/activity";

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityRecord[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void listActivity().then(setItems).catch((e) => setError(e.message)); }, []);
  return <PageShell title="Activity" subtitle="Recent agent actions and approval outcomes" width="max-w-3xl">
    <div className="space-y-3">
      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 p-3 text-sm text-danger"><AlertCircle className="size-4" />{error}</div>}
      {!error && items.length === 0 && <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-secondary"><ActivityIcon className="mx-auto mb-3 size-5 text-primary" />No activity has been recorded yet.</div>}
      {items.map((item) => <article key={item._id ?? item.id} className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-4"><p className="text-sm font-medium">{item.summary ?? item.type}</p><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{item.status}</span></div>
        <p className="mt-2 text-xs text-muted-foreground">{item.type} · {new Date(item.createdAt).toLocaleString()}</p>
      </article>)}
    </div>
  </PageShell>;
}
