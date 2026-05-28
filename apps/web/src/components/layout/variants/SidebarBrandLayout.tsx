import type { ReactNode } from "react";
import { useProfile } from "@/providers/ProfileProvider";
import { ShellHeader } from "../ShellHeader";

export function SidebarBrandLayout({ children }: { children: ReactNode }) {
  const { branding } = useProfile();

  return (
    <div className="flex min-h-screen">
      <aside
        className="flex w-20 shrink-0 items-center justify-center bg-[var(--color-primary)] text-[var(--color-primary-fg)] md:w-24"
        aria-label="Бренд"
      >
        <span
          className="font-bold tracking-widest"
          style={{
            writingMode: branding.sidebar.logoVertical ? "vertical-rl" : undefined,
            transform: branding.sidebar.logoVertical ? "rotate(180deg)" : undefined,
            fontFamily: "var(--font-accent)",
            fontSize: "1.25rem",
          }}
        >
          {branding.sidebar.logoText}
        </span>
      </aside>
      <div className="flex flex-1 flex-col bg-[var(--color-background)]">
        <ShellHeader />
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
