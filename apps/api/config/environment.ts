import { existsSync } from "node:fs";
import {  createCipheriv } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";

function workspaceRootFrom(start: string): string | undefined {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, "nx.json"))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

/** Resolves app and workspace dotenv files independent of Nx's current working directory. */
export function apiEnvironmentFiles(service: "gateway" | "agents" | "users", cwd = process.cwd(), moduleDirectory = __dirname): string[] {
  const root = workspaceRootFrom(cwd) ?? workspaceRootFrom(moduleDirectory);
  const candidates = [
    ...(root ? [join(root, "apps", "api", service, ".env")] : []),
    join(resolve(cwd), ".env"),
    ...(root ? [join(root, ".env")] : []),
  ];
  return [...new Set(candidates)].filter((file) => existsSync(file));
}

export function loadApiEnvironment(service: "gateway" | "agents" | "users") {
  return loadDotenv({ path: apiEnvironmentFiles(service) });
}

function validateOAuthEncryptionKey(config: Record<string, unknown>): void {
  const rawKey = config.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (typeof rawKey !== "string") {
    return; // Key not provided: services that do not encrypt OAuth tokens are not required to provide it.
  }
  const key = rawKey.trim();
  if (!key) {
    throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)");
  }
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)");
  }
  // Verify the key can actually be used for AES-256-GCM encryption/decryption.
  try {
    const keyBuffer = Buffer.from(key, "hex");
    if (keyBuffer.length !== 32) {
      throw new Error("OAUTH_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
    }
    const testCipher = createCipheriv("aes-256-gcm", keyBuffer, Buffer.alloc(12));
    testCipher.update("validation-test", "utf8");
    testCipher.final();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("OAUTH_TOKEN_ENCRYPTION_KEY")) {
      throw error;
    }
    throw new Error(`OAUTH_TOKEN_ENCRYPTION_KEY is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function validateApiEnvironment(config: Record<string, unknown>) {
  const configured = typeof config.WEB_URL === "string" ? config.WEB_URL.trim() : "";
  if (!configured) throw new Error("WEB_URL is required by the API services for OAuth redirects");

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("WEB_URL must be a valid absolute URL");
  }
  const localHttp = parsed.protocol === "http:" && /^(localhost|.*\.localhost|127\..*|\[::1\])$/.test(parsed.hostname);
  if ((parsed.protocol !== "https:" && !localHttp) || parsed.username || parsed.password) {
    throw new Error("WEB_URL must use HTTPS except for localhost development and must not contain credentials");
  }

  validateOAuthEncryptionKey(config);

  return { ...config, WEB_URL: parsed.origin };
}
