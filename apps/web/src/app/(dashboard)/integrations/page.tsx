import type { Metadata } from "next";
import { IntegrationList } from "@/components/integrations/IntegrationList";
import { PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  return (
    <PageShell title="Integrations" subtitle="Connect the accounts your agents can use" width="max-w-3xl">
      <IntegrationList />
    </PageShell>
  );
}
