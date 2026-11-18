import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { SettingsView } from "@/components/layout/SettingsView";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell title="Settings" subtitle="Your account and preferences" width="max-w-2xl">
      <SettingsView />
    </PageShell>
  );
}
