import { describe, expect, it } from "vitest";
import { oauthFailureDetails } from "../src/app/config/oauth-diagnostics";
import { appendOAuthCallbackFailure, getOAuthCallbackFailure } from "../../gateway/src/app/oauth-callback-error";
import { oauthStageMessage, sanitizeOAuthDiagnostic } from "../../../web/src/utils/oauth-feedback";

describe("OAuth failure reporting", () => {
  it("keeps the stage and safe diagnostic while removing credential-like values", () => {
    const failure = oauthFailureDetails("Google", "token_exchange", new Error(
      "invalid_grant state=private-state access_token=private-token https://provider.test/callback?code=private-code",
    ));
    expect(failure).toMatchObject({ provider: "google", stage: "token_exchange" });
    expect(failure.diagnostic.message).toContain("invalid_grant");
    expect(failure.diagnostic.message).not.toContain("private-state");
    expect(failure.diagnostic.message).not.toContain("private-token");
    expect(failure.diagnostic.message).not.toContain("private-code");
  });

  it("passes only the expected provider's known callback stage to the frontend", () => {
    const err = { statusCode: 502, message: "Safe failure", oauth: { provider: "instagram", stage: "account_lookup", status: 400, diagnostic: "Account lookup denied" } };
    expect(getOAuthCallbackFailure(err, "instagram")).toMatchObject({ stage: "account_lookup", status: 400, diagnostic: "Account lookup denied" });
    expect(getOAuthCallbackFailure(err, "google").stage).toBe("gateway_forwarding");
  });

  it("redirects safe callback stage and status without adding credentials", () => {
    const target = appendOAuthCallbackFailure(new URL("https://sutra.example/integrations"), {
      statusCode: 502,
      message: "Safe failure",
      oauth: { provider: "google", stage: "token_exchange", status: 400, diagnostic: "invalid_grant code=secret-code" },
    }, "google");
    expect(target.searchParams.get("stage")).toBe("token_exchange");
    expect(target.searchParams.get("http_status")).toBe("400");
    expect(target.searchParams.get("diagnostic")).not.toContain("secret-code");
  });

  it("maps callback stages to user messages and sanitizes browser diagnostics", () => {
    expect(oauthStageMessage("token_exchange")).toContain("redirect URI");
    expect(sanitizeOAuthDiagnostic("invalid_grant state=secret-state")).toBe("invalid_grant state=[redacted]");
  });
});
