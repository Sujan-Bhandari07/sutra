import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  IntegrationRequestError,
  getConnectUrl,
  listIntegrations,
  connectIntegration,
  disconnectIntegration,
} from "../integrations";

const API = "http://localhost:3001/api";

function mockFetch(response: Response | ((url: string) => Promise<Response> | Response)): void {
  const handler = typeof response === "function" ? response : () => response;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const result = handler(url);
      return result instanceof Promise ? result : Promise.resolve(result);
    }),
  );
}

describe("IntegrationRequestError", () => {
  it("carries an optional HTTP status", () => {
    const error = new IntegrationRequestError("boom", 502);
    expect(error.message).toBe("boom");
    expect(error.status).toBe(502);
    expect(error.name).toBe("IntegrationRequestError");
  });

  it("defaults status to undefined", () => {
    expect(new IntegrationRequestError("boom").status).toBeUndefined();
  });
});

describe("listIntegrations", () => {
  const originalFetch = global.fetch as ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | undefined;

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = (originalFetch ?? (async () => new Response())) as unknown as typeof global.fetch;
  });

  it("maps the backend payload to integration records", async () => {
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({
      success: true,
      message: "integrations found",
      payload: { integrations: {
        gmail: { connected: true, email: "person@example.test", connectedAt: "2026-01-01T00:00:00.000Z" },
        googlecalender: { connected: false, email: null, connectedAt: null },
        instagram: { connected: true, username: "sutra", connectedAt: "2026-02-02T00:00:00.000Z" },
      } },
    }))));

    const integrations = await listIntegrations();
    expect(integrations).toEqual([
      { tool: "instagram", connected: true, account: "sutra", connectedAt: "2026-02-02T00:00:00.000Z" },
      { tool: "gmail", connected: true, account: "person@example.test", connectedAt: "2026-01-01T00:00:00.000Z" },
      { tool: "googlecalendar", connected: false, account: undefined, connectedAt: undefined },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(`${API}/integrations`, expect.objectContaining({ credentials: "include" }));
  });

  it("throws IntegrationRequestError with status when the backend rejects the request", async () => {
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({ success: false, message: "invalid token" }), { status: 401 })));

    await expect(listIntegrations()).rejects.toMatchObject(new IntegrationRequestError("The integrations service rejected the request.", 401));
  });

  it("throws IntegrationRequestError when the backend returns malformed JSON", async () => {
    mockFetch(() => Promise.resolve(new Response("not json", { status: 200 })));

    await expect(listIntegrations()).rejects.toMatchObject(new IntegrationRequestError("The integrations service returned an invalid response.", 200));
  });

  it("throws IntegrationRequestError when the service is unreachable", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    await expect(listIntegrations()).rejects.toMatchObject(new IntegrationRequestError("Sutra could not reach the integrations service."));
  });

  it("throws when the payload shape is unexpected", async () => {
    mockFetch(() => Promise.resolve(new Response(JSON.stringify({ success: true, message: "ok" }))));

    await expect(listIntegrations()).rejects.toBeInstanceOf(IntegrationRequestError);
  });
});

describe("getConnectUrl", () => {
  it("builds the Google connect URL for gmail", () => {
    expect(getConnectUrl("gmail")).toBe(`${API}/integrations/google/connect?service=gmail`);
  });

  it("builds the Google connect URL for googlecalendar", () => {
    expect(getConnectUrl("googlecalendar")).toBe(`${API}/integrations/google/connect?service=calendar`);
  });

  it("builds the Instagram connect URL", () => {
    expect(getConnectUrl("instagram")).toBe(`${API}/integrations/instagram/connect`);
  });
});

describe("connectIntegration", () => {
  it("returns a not-connected integration without throwing", async () => {
    const result = await connectIntegration("instagram");
    expect(result).toEqual({ tool: "instagram", connected: false });
  });
});

describe("disconnectIntegration", () => {
  let fetched: string | null = null;
  let initialized: RequestInit | null | undefined = null;

  beforeEach(() => {
    fetched = null;
    initialized = null;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>((input: RequestInfo | URL, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : String(input);
        fetched = url;
        initialized = init;
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the disconnect endpoint with the provider and service", async () => {
    await disconnectIntegration("googlecalendar");
    expect(fetched).toBe(`${API}/integrations/disconnect/google?service=calendar`);
    expect(initialized?.method).toBe("POST");
    expect(initialized?.credentials).toBe("include");
  });

  it("calls the Instagram disconnect endpoint without a service", async () => {
    await disconnectIntegration("instagram");
    expect(fetched).toBe(`${API}/integrations/disconnect/instagram`);
    expect(initialized?.method).toBe("POST");
  });
});
