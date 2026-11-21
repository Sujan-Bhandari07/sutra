import { describe, expect, it } from "vitest";
import { oauthProviderName, oauthStageMessage, sanitizeOAuthDiagnostic } from "../oauth-feedback";

describe("oauthProviderName", () => {
  it("maps gmail and googlecalendar to Google", () => {
    expect(oauthProviderName("gmail")).toBe("Google");
    expect(oauthProviderName("googlecalendar")).toBe("Google");
  });

  it("maps instagram to Instagram", () => {
    expect(oauthProviderName("instagram")).toBe("Instagram");
  });
});

describe("oauthStageMessage", () => {
  it("returns a user message for every known stage", () => {
    const stages: string[] = [
      "authorization_request", "state_validation", "authorization", "callback_validation",
      "token_exchange", "account_lookup", "permission_validation", "persistence",
      "long_lived_token_exchange", "status_refresh", "gateway_forwarding", "unknown",
    ];
    for (const stage of stages) {
      const message = oauthStageMessage(stage);
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it("keeps provider-specific guidance for token exchange", () => {
    expect(oauthStageMessage("token_exchange")).toContain("redirect URI");
  });
});

describe("sanitizeOAuthDiagnostic", () => {
  it("redacts codes, tokens and secrets", () => {
    expect(sanitizeOAuthDiagnostic("invalid_grant state=secret-state code=secret-code")).toBe(
      "invalid_grant state=[redacted] code=[redacted]",
    );
    expect(sanitizeOAuthDiagnostic("access_token=secret-token")).toBe("access_token=[redacted]");
    expect(sanitizeOAuthDiagnostic("client_secret=secret-secret")).toBe("client_secret=[redacted]");
  });

  it("redacts provider URLs and long tokens", () => {
    expect(sanitizeOAuthDiagnostic("failed https://graph.facebook.com/v23.0/oauth/access_token?code=abc")).toContain("[provider-url]");
    expect(sanitizeOAuthDiagnostic("token=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")).toContain("[redacted]");
  });

  it("handles missing and malformed input gracefully", () => {
    expect(sanitizeOAuthDiagnostic(null)).toBeUndefined();
    expect(sanitizeOAuthDiagnostic(undefined as unknown as string | null)).toBeUndefined();
    expect(sanitizeOAuthDiagnostic("")).toBeUndefined();
    expect(sanitizeOAuthDiagnostic("plain failure message")).toBe("plain failure message");
  });
});
