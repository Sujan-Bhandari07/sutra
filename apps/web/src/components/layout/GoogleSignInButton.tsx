"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GoogleIcon } from "@/components/ui/brand-icons";
import { AuthNotConfiguredError, AuthBackendError, isFirebaseConfigured, signInWithGoogle } from "@/services/auth";
import { useAppStore } from "@/store/app-store";

export function GoogleSignInButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      await useAppStore.getState().refreshAuth();
      router.push("/chat");
    } catch (err) {
      if (err instanceof AuthNotConfiguredError) {
        setError(err.message);
      } else if (err instanceof AuthBackendError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Sign-in failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Button
        variant="secondary"
        size="lg"
        className="w-full bg-foreground text-background hover:bg-foreground/90 hover:text-background"
        onClick={handleSignIn}
        loading={loading}
        aria-describedby={error ? "login-error" : undefined}
      >
        {!loading && <GoogleIcon className="size-[18px]" />}
        {loading ? "Signing in..." : "Continue with Google"}
      </Button>

      {error && (
        <div
          id="login-error"
          role="alert"
          className="mt-4 flex gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-left text-[13px] leading-relaxed"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
          <div>
            <p>{error}</p>
            {!isFirebaseConfigured() && <p className="mt-1.5 text-secondary">Add the Firebase web configuration to enable sign-in.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
