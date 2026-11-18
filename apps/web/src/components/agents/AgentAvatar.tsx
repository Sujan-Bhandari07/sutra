import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

/** Tile for an agent. General uses the Sutra mark; custom agents use their initial. */
export function AgentAvatar({
  name,
  general,
  size = "md",
  className,
}: {
  name: string;
  general?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = { sm: "size-6 rounded-md text-[11px]", md: "size-8 rounded-lg text-sm", lg: "size-10 rounded-lg text-base" }[size];
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border border-border bg-elevated font-medium text-primary",
        dims,
        className,
      )}
    >
      {general ? <LogoMark className={size === "sm" ? "size-3.5" : size === "md" ? "size-[18px]" : "size-5"} /> : name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
