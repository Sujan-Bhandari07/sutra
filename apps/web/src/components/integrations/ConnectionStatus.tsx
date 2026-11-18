import { cn } from "@/lib/utils";

export function ConnectionStatus({
  connected,
  loading,
  className,
}: {
  connected: boolean;
  loading?: boolean;
  className?: string;
}) {
  if (loading) return <span className={cn("text-xs text-muted", className)}>Checking...</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", connected ? "text-success" : "text-muted", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", connected ? "bg-success" : "bg-muted")} />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}
