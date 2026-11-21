export type OAuthCallbackProvider = "google" | "instagram";

const callbackPaths: Record<OAuthCallbackProvider, { canonical: string; aliases: string[] }> = {
  google: {
    canonical: "/api/integrations/oauth/google/callback",
    aliases: ["/api/agents/google/callback"],
  },
  instagram: {
    canonical: "/api/integrations/oauth/instagram/callback",
    aliases: ["/api/agents/instagram/callback"],
  },
};

/** Public callback paths that the gateway must serve for this provider. */
export function getOAuthCallbackPaths(provider: OAuthCallbackProvider, configuredRedirectUri?: string): string[] {
  const routes = callbackPaths[provider];
  const customPath = configuredRedirectUri ? new URL(configuredRedirectUri).pathname : undefined;
  return [...new Set([...routes.aliases, ...(customPath && customPath !== routes.canonical ? [customPath] : [])])];
}
