"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./UserProfileMenu";
import { Button } from "@/components/ui/Button";
import { ConnectionStatus } from "@/components/integrations/ConnectionStatus";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { signOut } from "@/services/auth";
import { TOOLS } from "@/lib/tools";
import { useAppStore, type ThemePreference } from "@/store/app-store";
import { cn } from "@/lib/utils";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[15px] font-medium">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm text-secondary">{label}</span>
      <div className="min-w-0 text-sm sm:text-right">{children}</div>
    </div>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsView() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const integrations = useAppStore((s) => s.integrations);
  const integrationsStatus = useAppStore((s) => s.integrationsStatus);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      toast.success("Logged out");
      router.push("/login");
    } catch {
      toast.error("Couldn't log out. Try again.");
      setLoggingOut(false);
    }
  }

  const integrationsLoading = integrationsStatus === "idle" || integrationsStatus === "loading";

  return (
    <div className="space-y-9">
      <Section title="Profile">
        <div className="flex items-center gap-4 px-4 py-4">
          {user ? <Avatar name={user.name} className="size-12 text-base" /> : <LoadingSkeleton className="size-12 rounded-full" />}
          <div className="min-w-0">
            {user ? (
              <>
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-[13px] text-muted">{user.email}</p>
              </>
            ) : (
              <>
                <LoadingSkeleton className="h-4 w-32" />
                <LoadingSkeleton className="mt-2 h-3 w-44" />
              </>
            )}
          </div>
        </div>
      </Section>

      <Section title="Account" description="Details come from your sign-in provider.">
        <Row label="Email">{user?.email ?? <LoadingSkeleton className="h-4 w-40" />}</Row>
        <Row label="User ID">
          <code className="font-mono text-[13px] text-secondary">{user?.id ?? "..."}</code>
        </Row>
        <Row label="Sign-in method">Google</Row>
      </Section>

      <Section title="Connected accounts" description="Services your agents can use.">
        {TOOLS.map(({ id, label, Icon }) => {
          const connected = integrations.find((i) => i.tool === id)?.connected ?? false;
          return (
            <div key={id} className="flex items-center gap-3 px-4 py-3.5">
              <Icon className="size-5 shrink-0" />
              <span className="flex-1 text-sm">{label}</span>
              <ConnectionStatus connected={connected} loading={integrationsLoading} />
            </div>
          );
        })}
        <div className="px-4 py-3">
          <Link href="/integrations" className="text-[13px] text-primary underline underline-offset-4">
            Manage integrations
          </Link>
        </div>
      </Section>

      <Section title="Preferences">
        <Row label="Theme">
          <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] transition-colors",
                  theme === value ? "bg-elevated text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5">
        <div>
          <p className="text-sm font-medium">Log out</p>
          <p className="text-[13px] text-muted">You'll need to sign in again to use Sutra.</p>
        </div>
        <Button variant="secondary" onClick={handleLogout} loading={loggingOut}>
          <LogOut className="size-4" /> Log out
        </Button>
      </div>
    </div>
  );
}
