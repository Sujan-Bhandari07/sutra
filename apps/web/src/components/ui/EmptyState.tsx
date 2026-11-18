import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center", className)}>
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-secondary">
        <Icon className="size-5" />
      </div>
      <h3 className="text-[15px] font-medium">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
