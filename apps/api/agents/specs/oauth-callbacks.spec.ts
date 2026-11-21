import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { HttpException } from "@nestjs/common";

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  setCredentials: vi.fn(),
  userinfoGet: vi.fn(),
  oauth2: vi.fn(),
}));

vi.mock("googleapis", () => ({ google: { oauth2: mocks.oauth2 } }));
vi.mock("../src/app/config/google.OAuth", () => ({
  createOAuthClient: () => ({ getToken: mocks.getToken, setCredentials: mocks.setCredentials }),
  googleScopesFor: (service: "gmail" | "calendar") => [
    "openid", "email", "profile",
    ...(service === "gmail"
      ? ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/gmail.readonly"]
      : ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"]),
  ],
}));

import { AppService } from "../src/app/app.service";

function createService(provider: "google" | "instagram", save = vi.fn().mockResolvedValue(undefined)) {
  const integrationModel: any = Object.assign(function (this: any, document: Record<string, any>) {
    Object.assign(this, document);
    this.save = save;
  }, {
    findOne: vi.fn(() => ({ select: vi.fn().mockResolvedValue(null) })),
  });
  const jwt = {
    verifyAsync: vi.fn().mockResolvedValue({
      sub: "user-test",
      purpose: `${provider}-oauth`,
      service: "gmail",
      frontendOrigin: "http://localhost:3000",
    }),
  };
  const config = { getOrThrow: () => "http://localhost:3000" };
  const service = new AppService({} as any, integrationModel, jwt as any, config as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { service, integrationModel, jwt, save };
}

describe("OAuth callback processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OAUTH_TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    mocks.oauth2.mockReturnValue({ userinfo: { get: mocks.userinfoGet } });
    mocks.getToken.mockResolvedValue({ tokens: {
      access_token: "provider-access-token",
      refresh_token: "provider-refresh-token",
      expiry_date: Date.now() + 3600000,
      scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/gmail.readonly"].join(" "),
    } });
    mocks.userinfoGet.mockResolvedValue({ data: { id: "google-user", email: "person@example.test", name: "Test User" } });
  });

  it("persists a successful Google OAuth callback", async () => {
    const { service, save } = createService("google");
    const result = await service.googlecallback({ code: "code-value", state: "state-value" });
    expect(result).toMatchObject({ success: true, service: "gmail" });
    expect(save).toHaveBeenCalledOnce();
    expect(mocks.getToken).toHaveBeenCalledWith("code-value");
  });

  it("reports invalid state without attempting token exchange", async () => {
    const { service, jwt } = createService("google");
    jwt.verifyAsync.mockRejectedValueOnce(new Error("invalid state"));
    await expect(service.googlecallback({ code: "code-value", state: "bad-state" })).rejects.toMatchObject({
      response: { oauth: { provider: "google", stage: "state_validation" } },
    });
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it("identifies token exchange failures without returning the provider's secret fields", async () => {
    const { service } = createService("google");
    mocks.getToken.mockRejectedValueOnce(Object.assign(new Error("invalid_grant state=secret-state"), { response: { status: 400 } }));
    let failure: unknown;
    try { await service.googlecallback({ code: "code-value", state: "state-value" }); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(HttpException);
    const response = (failure as HttpException).getResponse() as any;
    expect(response.oauth).toMatchObject({ provider: "google", stage: "token_exchange", status: 400 });
    expect(response.oauth.diagnostic).not.toContain("secret-state");
  });

  it("reports a Mongo persistence failure as its own stage", async () => {
    const { service } = createService("google", vi.fn().mockRejectedValue(new Error("database write failed")));
    await expect(service.googlecallback({ code: "code-value", state: "state-value" })).rejects.toMatchObject({
      response: { oauth: { provider: "google", stage: "persistence" } },
    });
  });

  it("persists a successful Instagram callback after account lookup", async () => {
    const { service, save } = createService("instagram");
    process.env.INSTAGRAM_APP_ID = "test-app-id";
    process.env.INSTAGRAM_CLIENT_SECRET = "test-secret";
    process.env.INSTAGRAM_REDIRECT_URI = "https://gateway.example.test/api/integrations/oauth/instagram/callback";
    vi.spyOn(axios, "get")
      .mockResolvedValueOnce({ data: { access_token: "short-lived-token", expires_in: 3600 } } as any)
      .mockResolvedValueOnce({ data: { access_token: "long-lived-token", expires_in: 5184000 } } as any)
      .mockResolvedValueOnce({ data: { data: [{ instagram_business_account: { id: "ig-account", username: "sutra", name: "Sutra" } }] } } as any);
    const result = await service.instagramcallback({ code: "code-value", state: "state-value" });
    expect(result).toMatchObject({ success: true });
    expect(save).toHaveBeenCalledOnce();
    expect(axios.get).toHaveBeenCalledTimes(3);
  });

  it("reports Instagram token exchange failure and does not persist", async () => {
    const { service, save } = createService("instagram");
    process.env.INSTAGRAM_APP_ID = "test-app-id";
    process.env.INSTAGRAM_CLIENT_SECRET = "test-secret";
    process.env.INSTAGRAM_REDIRECT_URI = "https://gateway.example.test/api/integrations/oauth/instagram/callback";
    vi.spyOn(axios, "get").mockRejectedValueOnce(Object.assign(new Error("invalid_grant code=secret-code"), { response: { status: 400 } }));
    await expect(service.instagramcallback({ code: "code-value", state: "state-value" })).rejects.toMatchObject({
      response: { oauth: { provider: "instagram", stage: "token_exchange", status: 400 } },
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("handles a provider authorization denial without token exchange", async () => {
    const { service } = createService("instagram");
    await expect(service.instagramcallback({ state: "state-value", error: "access_denied" })).rejects.toMatchObject({
      response: { oauth: { provider: "instagram", stage: "authorization" } },
    });
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("reports an incomplete Google profile as account_lookup without persisting", async () => {
    const { service, save } = createService("google");
    mocks.userinfoGet.mockResolvedValueOnce({ data: { id: "", email: "" } });
    await expect(service.googlecallback({ code: "code-value", state: "state-value" })).rejects.toMatchObject({
      response: { oauth: { provider: "google", stage: "account_lookup" } },
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("reports an Instagram persistence failure as its own stage", async () => {
    const { service, save } = createService("instagram", vi.fn().mockRejectedValue(new Error("database write failed")));
    process.env.INSTAGRAM_APP_ID = "test-app-id";
    process.env.INSTAGRAM_CLIENT_SECRET = "test-secret";
    process.env.INSTAGRAM_REDIRECT_URI = "https://gateway.example.test/api/integrations/oauth/instagram/callback";
    vi.spyOn(axios, "get")
      .mockResolvedValueOnce({ data: { access_token: "short-lived-token", expires_in: 3600 } } as any)
      .mockResolvedValueOnce({ data: { access_token: "long-lived-token", expires_in: 5184000 } } as any)
      .mockResolvedValueOnce({ data: { data: [{ instagram_business_account: { id: "ig-account", username: "sutra", name: "Sutra" } }] } } as any);
    await expect(service.instagramcallback({ code: "code-value", state: "state-value" })).rejects.toMatchObject({
      response: { oauth: { provider: "instagram", stage: "persistence" } },
    });
    expect(save).toHaveBeenCalledOnce();
  });

  it("reports no Facebook Pages as account_lookup without persisting", async () => {
    const { service, save } = createService("instagram");
    process.env.INSTAGRAM_APP_ID = "test-app-id";
    process.env.INSTAGRAM_CLIENT_SECRET = "test-secret";
    process.env.INSTAGRAM_REDIRECT_URI = "https://gateway.example.test/api/integrations/oauth/instagram/callback";
    vi.spyOn(axios, "get")
      .mockResolvedValueOnce({ data: { access_token: "short-lived-token", expires_in: 3600 } } as any)
      .mockResolvedValueOnce({ data: { access_token: "long-lived-token", expires_in: 5184000 } } as any)
      .mockResolvedValueOnce({ data: { data: [] } } as any);
    await expect(service.instagramcallback({ code: "code-value", state: "state-value" })).rejects.toMatchObject({
      response: { oauth: { provider: "instagram", stage: "account_lookup" } },
    });
    expect(save).not.toHaveBeenCalled();
  });

  it("reports pages without Instagram business account as account_lookup without persisting", async () => {
    const { service, save } = createService("instagram");
    process.env.INSTAGRAM_APP_ID = "test-app-id";
    process.env.INSTAGRAM_CLIENT_SECRET = "test-secret";
    process.env.INSTAGRAM_REDIRECT_URI = "https://gateway.example.test/api/integrations/oauth/instagram/callback";
    vi.spyOn(axios, "get")
      .mockResolvedValueOnce({ data: { access_token: "short-lived-token", expires_in: 3600 } } as any)
      .mockResolvedValueOnce({ data: { access_token: "long-lived-token", expires_in: 5184000 } } as any)
      .mockResolvedValueOnce({ data: { data: [{ id: "page-1", name: "Page 1", instagram_business_account: null }] } } as any);
    await expect(service.instagramcallback({ code: "code-value", state: "state-value" })).rejects.toMatchObject({
      response: { oauth: { provider: "instagram", stage: "account_lookup" } },
    });
    expect(save).not.toHaveBeenCalled();
  });
});
