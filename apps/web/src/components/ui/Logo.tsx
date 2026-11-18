import { cn } from "@/lib/utils";

/** The Sutra mark: a single continuous thread forming an "S". */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-6", className)}>
      <path
        d="M21.5 8.5C19.8 6.6 17.2 5.8 14.8 6.1 11.4 6.5 9.5 8.9 10.2 11.5c.8 3 4.3 3.7 7 4.5 3.1.9 5.3 2.2 5.1 5.1-.2 3-3.2 5-6.6 4.9-2.5-.1-4.8-1.3-6.2-3.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="22.8" cy="26.2" r="1.7" fill="currentColor" />
    </svg>
  );
}

export function Logo({ showWordmark = true, className }: { showWordmark?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-primary">
        <LogoMark className="size-[18px]" />
      </span>
      {showWordmark && <span className="text-[17px] font-semibold tracking-tight">Sutra</span>}
    </span>
  );
}
