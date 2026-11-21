import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ServiceUnavailableException } from "@nestjs/common";

function encryptionKey() {
  const value = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  if (!value || !/^[\da-f]{64}$/i.test(value)) {
    throw new ServiceUnavailableException("OAUTH_TOKEN_ENCRYPTION_KEY must be a 32-byte hex key");
  }
  return Buffer.from(value, "hex");
}

export function protectOAuthToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function revealOAuthToken(token: string) {
  if (!token.startsWith("v1.")) return token; // Compatibility with credentials saved before encryption was enabled.
  const [, iv, tag, ciphertext] = token.split(".");
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new ServiceUnavailableException("OAuth credentials could not be decrypted; check OAUTH_TOKEN_ENCRYPTION_KEY");
  }
}
