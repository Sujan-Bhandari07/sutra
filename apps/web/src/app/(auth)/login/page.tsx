import type { Metadata } from "next";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/layout/GoogleSignInButton";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* One quiet thread running down the page: the product's only flourish. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 h-full w-[600px] -translate-x-1/2 text-primary opacity-[0.14]"
        viewBox="0 0 600 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M300 -20 C 300 120, 120 160, 190 300 S 470 420, 400 560 S 230 700, 300 920"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>

      <main className="relative z-10 flex w-full max-w-[360px] flex-col items-center text-center">
        <Logo className="mb-10" />
        <h1 className="text-balance text-[28px] font-semibold leading-tight tracking-tight">Agents that do the work</h1>
        <p className="mt-3 text-pretty text-[15px] leading-relaxed text-secondary">
          Build AI agents with their own instructions, connect Gmail, Google Calendar, and Instagram, and hand off the
          routine tasks.
        </p>
        <div className="mt-9 w-full">
          <GoogleSignInButton />
        </div>
        <p className="mt-8 text-xs leading-relaxed text-muted">
          By continuing, you agree to the{" "}
          <Link href="#" className="underline underline-offset-4 hover:text-secondary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="#" className="underline underline-offset-4 hover:text-secondary">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
