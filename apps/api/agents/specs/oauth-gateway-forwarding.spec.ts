import { describe, expect, it, vi } from "vitest";
import { of, throwError } from "rxjs";
import { IntegrationController } from "../../gateway/src/app/controller/integration.controller";

const config = { getOrThrow: () => "http://localhost:3000" } as any;
const response = () => ({ redirect: vi.fn() }) as any;

describe("gateway OAuth callback forwarding", () => {
  it("forwards Google callback parameters and redirects after agents confirm persistence", async () => {
    const agents = { send: vi.fn(() => of({ success: true, frontendOrigin: "http://localhost:3000", service: "calendar" })) } as any;
    const controller = new IntegrationController(agents, config);
    const res = response();
    await controller.googleCallback({ code: "test-code", state: "test-state" }, res);
    expect(agents.send).toHaveBeenCalledWith("integration.google.callback", { code: "test-code", state: "test-state" });
    expect(res.redirect).toHaveBeenCalledWith("http://localhost:3000/integrations?integration=googlecalendar&status=success");
  });

  it("forwards Instagram authorization errors and returns only safe failure details", async () => {
    const agents = { send: vi.fn(() => throwError(() => ({
      statusCode: 502,
      message: "The provider could not complete authorization.",
      oauth: { provider: "instagram", stage: "token_exchange", status: 400, diagnostic: "invalid_grant code=[redacted]" },
    }))) } as any;
    const controller = new IntegrationController(agents, config);
    const res = response();
    await controller.instagramCallback({ error: "access_denied", state: "test-state" }, res);
    expect(agents.send).toHaveBeenCalledWith("integration.instagram.callback", { error: "access_denied", state: "test-state" });
    const target = new URL(res.redirect.mock.calls[0][0]);
    expect(target.searchParams.get("status")).toBe("error");
    expect(target.searchParams.get("stage")).toBe("token_exchange");
    expect(target.searchParams.get("http_status")).toBe("400");
    expect(target.searchParams.get("diagnostic")).toContain("invalid_grant");
    expect(target.searchParams.get("diagnostic")).not.toContain("test-state");
  });

  it("redirects safely when RabbitMQ fails without exposing the internal error", async () => {
    const agents = { send: vi.fn(() => throwError(() => new Error("transport failed with secret=private"))) } as any;
    const controller = new IntegrationController(agents, config);
    const res = response();
    await controller.googleCallback({ state: "test-state" }, res);
    const target = new URL(res.redirect.mock.calls[0][0]);
    expect(target.searchParams.get("stage")).toBe("gateway_forwarding");
    expect(target.searchParams.get("message")).not.toContain("private");
    expect(target.searchParams.get("integration")).toBe("gmail");
  });

  it("redirects to the frontend error state when Google connect fails instead of returning a raw error", async () => {
    const agents = { send: vi.fn(() => throwError(() => new Error("agents unavailable"))) } as any;
    const controller = new IntegrationController(agents, config);
    const res = response();
    await controller.connectGoogle({ user: "sub" } as any, res, undefined);
    const target = new URL(res.redirect.mock.calls[0][0]);
    expect(target.searchParams.get("status")).toBe("error");
    expect(target.searchParams.get("integration")).toBe("gmail");
    expect(target.searchParams.get("stage")).toBe("gateway_forwarding");
    expect(target.searchParams.get("message")).not.toContain("unavailable");
  });

  it("redirects to the frontend error state when Instagram connect fails", async () => {
    const agents = { send: vi.fn(() => throwError(() => new Error("agents unavailable"))) } as any;
    const controller = new IntegrationController(agents, config);
    const res = response();
    await controller.connectInstagram({ user: "sub" } as any, res);
    const target = new URL(res.redirect.mock.calls[0][0]);
    expect(target.searchParams.get("status")).toBe("error");
    expect(target.searchParams.get("integration")).toBe("instagram");
    expect(target.searchParams.get("stage")).toBe("gateway_forwarding");
  });
});
