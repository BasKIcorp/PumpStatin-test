import type { ReactNode } from "react";
import { FIGMA } from "./figmaTokens";
import { useAdminLayout } from "@/pages/admin/adminLayoutContext";
import { cn } from "@/lib/cn";

export function FigmaEditorFrame({ children }: { children: ReactNode }) {
  const { sidebarOpen } = useAdminLayout();

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden transition-[left] duration-200 ease-out",
        sidebarOpen ? "left-56" : "left-0",
      )}
      style={{ background: FIGMA.appBg }}
    >
      {children}
    </div>
  );
}
