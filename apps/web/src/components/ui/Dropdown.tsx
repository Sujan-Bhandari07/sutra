"use client";

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const Dropdown = Menu.Root;
export const DropdownTrigger = Menu.Trigger;

export function DropdownContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 rounded-xl border border-border bg-surface p-1 shadow-2xl shadow-black/40",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownItem({
  className,
  danger,
  ...props
}: React.ComponentPropsWithoutRef<typeof Menu.Item> & { danger?: boolean }) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors",
        danger
          ? "text-danger data-[highlighted]:bg-danger/10"
          : "text-secondary data-[highlighted]:bg-elevated data-[highlighted]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export const DropdownSeparator = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Separator>) => (
  <Menu.Separator className={cn("my-1 h-px bg-border", className)} {...props} />
);

export const DropdownLabel = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Label>) => (
  <Menu.Label className={cn("px-2.5 py-1.5 text-xs text-muted", className)} {...props} />
);
