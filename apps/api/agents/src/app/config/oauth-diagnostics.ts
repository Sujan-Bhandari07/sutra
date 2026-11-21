import axios from "axios";

export type OAuthProviderName = "Google" | "Instagram";
export type OAuthFailureStage = "state_validation" | "authorization" | "callback_validation" | "token_exchange" | "account_lookup" | "permission_validation" | "persistence";

const publicMessages: Record<OAuthFailureStage, string> = {
  state_validation: "The authorization session is invalid or expired. Start the connection again.",
  authorization: "Authorization was cancelled or denied by the provider.",
  callback_validation: "The provider returned an incomplete response. Start the connection again.",
  token_exchange: "The provider could not complete authorization. Check the redirect URI and try again.",
  account_lookup: "Permission was granted, but account information could not be retrieved.",
  permission_validation: "The required permissions were not granted. Reconnect and approve the requested permissions.",
  persistence: "The provider verified the account, but Sutra could not save the connection.",
};

function safeDiagnostic(error: unknown): { status?: number; code?: string; message: string } {
  const value = error as { code?: unknown; response?: { status?: unknown; data?: any }; message?: unknown };
  const providerError = value?.response?.data?.error;
  const rawMessage = typeof value?.response?.data?.error_description === "string"
    ? value.response.data.error_description
    : typeof providerError?.message === "string"
      ? providerError.message
      : typeof providerError === "string"
        ? providerError
        : typeof value?.message === "string" ? value.message : "OAuth operation failed";
  const message = rawMessage
    .replace(/https?:\/\/[^\s"']+/gi, "[provider-url]")
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[redacted]")
    .replace(/\b(code|state|access_token|refresh_token|client_secret|client_id|authorization|token)=([^\s&,]+)/gi, "$1=[redacted]")
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[redacted]")
    .slice(0, 240);
  const status = Number(value?.response?.status);
  return {
    ...(Number.isInteger(status) && status >= 400 && status <= 599 ? { status } : {}),
    ...(typeof value?.code === "string" && /^[A-Z0-9_-]{1,40}$/i.test(value.code) ? { code: value.code } : {}),
    message,
  };
}

export function oauthFailureDetails(provider: OAuthProviderName, stage: OAuthFailureStage, error: unknown) {
  const diagnostic = safeDiagnostic(error);
  const errorName = axios.isAxiosError(error) ? "AxiosError" : error instanceof Error ? error.name : "UnknownError";
  return {
    provider: provider.toLowerCase(),
    stage,
    status: diagnostic.status,
    diagnostic: { name: errorName, code: diagnostic.code, message: diagnostic.message },
    message: publicMessages[stage],
  };
}

export function oauthPublicMessage(stage: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(publicMessages, stage)
    ? publicMessages[stage as OAuthFailureStage]
    : undefined;
}
