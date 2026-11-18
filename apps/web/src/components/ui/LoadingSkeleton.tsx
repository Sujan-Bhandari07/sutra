import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-elevated", className)} />;
}

export function AgentCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <LoadingSkeleton className="size-10 rounded-lg" />
        <LoadingSkeleton className="h-4 w-32" />
      </div>
      <LoadingSkeleton className="mt-4 h-3 w-full" />
      <LoadingSkeleton className="mt-2 h-3 w-2/3" />
      <div className="mt-5 flex gap-2">
        <LoadingSkeleton className="h-6 w-20 rounded-full" />
        <LoadingSkeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}
