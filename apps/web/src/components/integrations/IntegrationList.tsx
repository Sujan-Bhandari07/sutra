"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { IntegrationCard } from "./IntegrationCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAppStore } from "@/store/app-store";
import { oauthProviderName, oauthStageMessage, sanitizeOAuthDiagnostic, type OAuthIntegration } from "@/utils/oauth-feedback";

export function IntegrationList() {
  const integrations = useAppStore((s) => s.integrations);
  const status = useAppStore((s) => s.integrationsStatus);
  const load = useAppStore((s) => s.loadIntegrations);
  const callbackHandled = useRef(false);

  useEffect(() => {
    if (callbackHandled.current) return;
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    const integration = url.searchParams.get("integration");
    if (!status || !integration || !["gmail", "googlecalendar", "instagram"].includes(integration)) return;
    callbackHandled.current = true;
    const tool = integration as OAuthIntegration;
    const provider = oauthProviderName(tool);
    const stage = url.searchParams.get("stage") ?? "gateway_forwarding";
    const httpStatus = Number(url.searchParams.get("http_status")) || undefined;
    const diagnostic = sanitizeOAuthDiagnostic(url.searchParams.get("diagnostic"));
    const cleanUrl = () => {
      url.searchParams.delete("status");
      url.searchParams.delete("integration");
      url.searchParams.delete("stage");
      url.searchParams.delete("http_status");
      url.searchParams.delete("message");
      url.searchParams.delete("diagnostic");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    };
    if (status === "success") {
      cleanUrl();
      void load().then((result) => {
        const connected = useAppStore.getState().integrations.find((item) => item.tool === tool)?.connected;
        if (result.ok && connected) {
          toast.success(`${tool === "googlecalendar" ? "Google Calendar" : tool === "gmail" ? "Gmail" : "Instagram"} connected`);
          return;
        }
        const message = oauthStageMessage("status_refresh");
        console.error(`[OAuth] ${provider} connection failed:`, {
          stage: "status_refresh",
          status: result.status ?? httpStatus ?? null,
          message: diagnostic ?? message,
        });
        toast.error(message);
      });
    } else if (status === "error") {
      const message = oauthStageMessage(stage);
      console.error(`[OAuth] ${provider} connection failed:`, { stage, status: httpStatus ?? null, message: diagnostic ?? message });
      toast.error(message);
      cleanUrl();
    }
  }, [load]);

  if (status === "error") {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load your integrations"
        description="Something went wrong while checking your connections. Try again."
        action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-secondary">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Accounts connect through provider OAuth. Tokens remain on the server, and an account appears here only after the provider confirms the connection.
        </p>
      </div>

      {status === "idle" || status === "loading"
        ? [0, 1, 2].map((i) => <LoadingSkeleton key={i} className="h-44 w-full rounded-xl" />)
        : integrations.map((i) => <IntegrationCard key={i.tool} integration={i} />)}
    </div>
  );
}
