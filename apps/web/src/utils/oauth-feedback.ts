export type OAuthIntegration = "gmail" | "googlecalendar" | "instagram";

export function oauthProviderName(integration: OAuthIntegration): "Google" | "Instagram" {
  return integration === "instagram" ? "Instagram" : "Google";
}

export function oauthStageMessage(stage: string): string {
  switch (stage) {
    case "authorization_request": return "Sutra could not start the provider authorization. Check your connection and try again.";
    case "state_validation": return "The authorization session expired or could not be verified. Start again.";
    case "authorization": return "Authorization was cancelled or denied by the provider.";
    case "callback_validation": return "The provider returned an incomplete response. Start again.";
    case "token_exchange": return "The provider could not complete authorization. Check the redirect URI and try again.";
    case "account_lookup": return "Permission was granted, but the provider could not retrieve account information.";
    case "permission_validation": return "The required permissions were not granted. Reconnect and approve the requested permissions.";
    case "persistence": return "The account was authorized, but Sutra could not save the connection.";
    case "long_lived_token_exchange": return "The provider granted a temporary connection. Reconnect if it expires before use.";
    case "status_refresh": return "Sutra could not confirm the saved connection. Reload integrations to check its status.";
    default: return "Sutra could not complete the provider callback. Try connecting again.";
  }
}

export function sanitizeOAuthDiagnostic(value: string | null): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/https?:\/\/[^\s"']+/gi, "[provider-url]")
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[redacted]")
    .replace(/\b(code|state|access_token|refresh_token|client_secret|client_id|authorization|token)=([^\s&,]+)/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[redacted]")
    .slice(0, 240);
}
