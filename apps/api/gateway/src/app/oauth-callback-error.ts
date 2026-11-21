export type OAuthCallbackProvider = "google" | "instagram";

const knownStages = new Set([
  "state_validation", "authorization", "callback_validation", "token_exchange",
  "account_lookup", "permission_validation", "persistence", "long_lived_token_exchange",
]);

export function getOAuthCallbackFailure(error: unknown, provider: OAuthCallbackProvider) {
  const value = error as {
    statusCode?: unknown;
    status?: unknown;
    message?: unknown;
    oauth?: { provider?: unknown; stage?: unknown; status?: unknown; diagnostic?: unknown };
  };
  const oauth = value?.oauth;
  if (oauth?.provider === provider && typeof oauth.stage === "string" && knownStages.has(oauth.stage)) {
    const status = Number(oauth.status ?? value.statusCode ?? value.status);
    return {
      stage: oauth.stage,
      ...(Number.isInteger(status) && status >= 400 && status <= 599 ? { status } : {}),
      message: typeof value.message === "string" ? value.message.slice(0, 240) : "The provider could not complete the connection.",
      ...(typeof oauth.diagnostic === "string" ? {
        diagnostic: oauth.diagnostic
          .replace(/https?:\/\/[^\s"']+/gi, "[provider-url]")
          .replace(/\b(code|state|access_token|refresh_token|client_secret|client_id|authorization|token)=([^\s&,]+)/gi, "$1=[redacted]")
          .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[redacted]")
          .slice(0, 240),
      } : {}),
    };
  }
  return {
    stage: "gateway_forwarding",
    ...(Number.isInteger(value?.statusCode) ? { status: Number(value.statusCode) } : {}),
    message: "Sutra could not complete the provider callback. Try connecting again.",
  };
}

export function appendOAuthCallbackFailure(target: URL, error: unknown, provider: OAuthCallbackProvider) {
  const failure = getOAuthCallbackFailure(error, provider);
  target.searchParams.set("status", "error");
  target.searchParams.set("stage", failure.stage);
  if (failure.status) target.searchParams.set("http_status", String(failure.status));
  target.searchParams.set("message", failure.message);
  if (failure.diagnostic) target.searchParams.set("diagnostic", failure.diagnostic);
  return target;
}
