import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { apiEnvironmentFiles, validateApiEnvironment } from "../../config/environment";

describe("API environment configuration", () => {
  const workspace = process.cwd();
  const expectedRootEnv = resolve(workspace, ".env");

  it("finds the root env file from the workspace root", () => {
    expect(apiEnvironmentFiles("agents", workspace)).toContain(expectedRootEnv);
  });

  it("finds the same root env file from the app working directory", () => {
    expect(apiEnvironmentFiles("agents", resolve(workspace, "apps/api/agents"))).toContain(expectedRootEnv);
  });

  it("loads the configured local frontend URL from root env for both OAuth services", () => {
    for (const service of ["gateway", "agents"] as const) {
      const rootEnv = apiEnvironmentFiles(service, workspace).find((file) => file === expectedRootEnv);
      expect(rootEnv).toBeDefined();
      const parsed = parse(readFileSync(rootEnv!, "utf8"));
      expect(parsed.WEB_URL).toBe("http://localhost:3000");
    }
  });

  it("requires a secure configured frontend URL and normalizes it to an origin", () => {
    expect(validateApiEnvironment({ WEB_URL: "http://localhost:3000/path" }).WEB_URL).toBe("http://localhost:3000");
    expect(() => validateApiEnvironment({})).toThrow("WEB_URL is required");
    expect(() => validateApiEnvironment({ WEB_URL: "http://example.com" })).toThrow("must use HTTPS");
  });

  describe("OAUTH_TOKEN_ENCRYPTION_KEY validation", () => {
    it("accepts a valid 64-character hex key", () => {
      const result = validateApiEnvironment({
        WEB_URL: "http://localhost:3000",
        OAUTH_TOKEN_ENCRYPTION_KEY: "a".repeat(64),
      });
      expect(result.OAUTH_TOKEN_ENCRYPTION_KEY).toBe("a".repeat(64));
    });

    it("accepts a key without the key for services that do not encrypt tokens", () => {
      const result = validateApiEnvironment({ WEB_URL: "http://localhost:3000" });
      expect(result.OAUTH_TOKEN_ENCRYPTION_KEY).toBeUndefined();
    });

    it("rejects a missing key when explicitly provided as empty", () => {
      expect(() =>
        validateApiEnvironment({ WEB_URL: "http://localhost:3000", OAUTH_TOKEN_ENCRYPTION_KEY: "" }),
      ).toThrow("OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string");
    });

    it("rejects a key that is not hexadecimal", () => {
      expect(() =>
        validateApiEnvironment({ WEB_URL: "http://localhost:3000", OAUTH_TOKEN_ENCRYPTION_KEY: "g".repeat(64) }),
      ).toThrow("OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string");
    });

    it("rejects a key that is too short", () => {
      expect(() =>
        validateApiEnvironment({ WEB_URL: "http://localhost:3000", OAUTH_TOKEN_ENCRYPTION_KEY: "a".repeat(62) }),
      ).toThrow("OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string");
    });

    it("rejects a key that is too long", () => {
      expect(() =>
        validateApiEnvironment({ WEB_URL: "http://localhost:3000", OAUTH_TOKEN_ENCRYPTION_KEY: "a".repeat(66) }),
      ).toThrow("OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string");
    });
  });
});
