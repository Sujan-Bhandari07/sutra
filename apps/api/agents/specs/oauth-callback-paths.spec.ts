import { describe, expect, it } from "vitest";
import { getOAuthCallbackPaths } from "../../gateway/src/app/oauth-callback-paths";

describe("public OAuth callback paths", () => {
  it("forwards the configured Instagram callback and the legacy gateway path", () => {
    expect(getOAuthCallbackPaths("instagram", "https://public.example/api/agents/instagram/callback")).toEqual([
      "/api/agents/instagram/callback",
    ]);
  });

  it("always exposes the Instagram callback alias even without a custom redirect URI", () => {
    expect(getOAuthCallbackPaths("instagram")).toContain("/api/agents/instagram/callback");
  });

  it("does not register a second route for the canonical NestJS callback", () => {
    expect(getOAuthCallbackPaths("instagram", "https://public.example/api/integrations/oauth/instagram/callback")).toEqual([
      "/api/agents/instagram/callback",
    ]);
  });

  it("forwards the Google legacy callback path and preserves configured custom paths", () => {
    expect(getOAuthCallbackPaths("google", "https://public.example/auth/google/return")).toEqual([
      "/api/agents/google/callback",
      "/auth/google/return",
    ]);
  });

  it("does not duplicate the Google alias when it is the configured redirect path", () => {
    expect(getOAuthCallbackPaths("google", "http://localhost:8000/api/agents/google/callback")).toEqual([
      "/api/agents/google/callback",
    ]);
  });
});
