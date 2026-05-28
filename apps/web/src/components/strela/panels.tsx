import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const panelClass = cn(
  "selection-work-panel flex min-h-0 flex-col overflow-hidden rounded-lg",
  "border-l-[3px] border-l-transparent transition-[border-left-color] duration-200 ease-out",
  "hover:border-l-[var(--funnel-primary)] focus-within:border-l-[var(--funnel-primary)]",
);

export const panelHeadClass = "selection-work-panel-head";

export function WorkPanel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn(panelClass, className)}>
      <div className={panelHeadClass}>{title}</div>
      {children}
    </div>
  );
}
